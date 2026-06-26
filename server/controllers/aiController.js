import asyncHandler from 'express-async-handler';
import Anthropic from '@anthropic-ai/sdk';
import Product from '../models/Product.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Shared helper — single Claude call with a system prompt
const callClaude = async (systemPrompt, userMessage, maxTokens = 1024) => {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return message.content[0].text.trim();
};

// ─── POST /api/ai/search ──────────────────────────────────────────────────────
// Natural language → structured filter object, then query products
export const aiSearch = asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (!query || query.trim().length < 3) {
    res.status(400);
    throw new Error('Search query must be at least 3 characters');
  }

  const systemPrompt = `You are a shopping assistant for Vendrix, an e-commerce platform.
Your job is to extract structured search filters from a natural language query.

Available categories: Electronics, Clothing, Home & Garden, Sports & Outdoors, Health & Beauty, Toys & Games, Books, Automotive, Food & Grocery, Jewelry, Art & Crafts, Pet Supplies, Office Supplies, Other

Respond ONLY with a valid JSON object — no explanation, no markdown:
{
  "keywords": "string or null",
  "category": "exact category name or null",
  "maxPrice": number or null,
  "minPrice": number or null,
  "minRating": number or null,
  "tags": ["tag1", "tag2"] or [],
  "intent": "one-sentence human-readable summary of what the user is looking for"
}`;

  let filters;
  try {
    const raw = await callClaude(systemPrompt, query, 512);
    // Strip any accidental markdown code fences
    const jsonStr = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
    filters = JSON.parse(jsonStr);
  } catch {
    // Fallback to keyword-only search if Claude response is unparseable
    filters = { keywords: query, intent: query };
  }

  // Build MongoDB filter from extracted filters
  const dbFilter = { isPublished: true, isApproved: true };

  if (filters.keywords) dbFilter.$text = { $search: filters.keywords };
  if (filters.category) dbFilter.category = filters.category;
  if (filters.maxPrice || filters.minPrice) {
    dbFilter.price = {};
    if (filters.minPrice) dbFilter.price.$gte = filters.minPrice;
    if (filters.maxPrice) dbFilter.price.$lte = filters.maxPrice;
  }
  if (filters.minRating) dbFilter.rating = { $gte: filters.minRating };
  if (filters.tags?.length) dbFilter.tags = { $in: filters.tags };

  const products = await Product.find(dbFilter)
    .sort(filters.keywords ? { score: { $meta: 'textScore' } } : { rating: -1 })
    .limit(20)
    .select('name images price rating numReviews slug category stock')
    .populate('vendor', 'name vendorInfo.shopName');

  res.json({
    success: true,
    intent: filters.intent || query,
    filters: {
      keywords: filters.keywords,
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      tags: filters.tags,
    },
    products,
    total: products.length,
  });
});

// ─── GET /api/ai/review-summary/:productId ────────────────────────────────────
// Summarise all reviews for a product in 3 concise lines
// Result is cached on the product document; regenerated when reviews change
export const getReviewSummary = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId).select(
    'name reviews reviewSummary numReviews rating'
  );

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (product.reviews.length === 0) {
    return res.json({ success: true, summary: null, message: 'No reviews yet' });
  }

  // Serve cached summary if fresh (regenerated max once per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (product.reviewSummary?.text && product.reviewSummary.generatedAt > oneHourAgo) {
    return res.json({ success: true, summary: product.reviewSummary.text, cached: true });
  }

  // Build review text corpus (cap at 50 reviews to stay within token budget)
  const reviewSample = product.reviews.slice(-50);
  const reviewText = reviewSample
    .map((r) => `[${r.rating}/5] ${r.title}: ${r.comment}`)
    .join('\n');

  const systemPrompt = `You are a shopping assistant summarising customer reviews for a product listing.
Write exactly 3 short bullet points (one sentence each) covering:
1. What customers love most
2. Common complaints or limitations
3. Who this product is best suited for

Be honest, balanced, and specific. Do not mention the product name. Start each bullet with "•".`;

  const userMessage = `Product: "${product.name}"
Overall rating: ${product.rating}/5 from ${product.numReviews} reviews

Reviews:
${reviewText}`;

  const summary = await callClaude(systemPrompt, userMessage, 300);

  // Cache result on product document
  product.reviewSummary = { text: summary, generatedAt: new Date() };
  await product.save({ validateBeforeSave: false });

  res.json({ success: true, summary, cached: false });
});

// ─── POST /api/ai/generate-description ───────────────────────────────────────
// Vendor enters product name + bullet features → AI writes an SEO product description
export const generateProductDescription = asyncHandler(async (req, res) => {
  const { productName, features, category, targetAudience, tone } = req.body;

  if (!productName || !features) {
    res.status(400);
    throw new Error('productName and features are required');
  }

  if (!Array.isArray(features) || features.length === 0) {
    res.status(400);
    throw new Error('features must be a non-empty array');
  }

  const descTone = tone || 'professional and engaging';

  const systemPrompt = `You are an expert e-commerce copywriter for Vendrix marketplace.
Write SEO-optimised product descriptions that drive conversions.
Tone: ${descTone}.
Rules:
- 150–200 words
- Start with a compelling hook sentence
- Naturally incorporate the product's key features
- Include a soft call-to-action in the final sentence
- Do NOT use hollow filler phrases like "perfect for everyone" or "high quality"
- Return ONLY the description text — no titles, no markdown`;

  const featureList = features.map((f) => `• ${f}`).join('\n');
  const userMessage = `Product name: ${productName}
Category: ${category || 'General'}
Target audience: ${targetAudience || 'General consumers'}
Key features:
${featureList}`;

  const description = await callClaude(systemPrompt, userMessage, 512);

  res.json({ success: true, description });
});

// ─── POST /api/ai/generate-meta ───────────────────────────────────────────────
// Generate SEO meta title + meta description from product info
export const generateMetaTags = asyncHandler(async (req, res) => {
  const { productName, description, category } = req.body;

  if (!productName || !description) {
    res.status(400);
    throw new Error('productName and description are required');
  }

  const systemPrompt = `You are an SEO expert. Generate a meta title and meta description for an e-commerce product.
Rules:
- Meta title: max 60 characters, include product name, compelling
- Meta description: max 155 characters, include a benefit and soft CTA
Respond ONLY with valid JSON:
{"metaTitle": "...", "metaDescription": "..."}`;

  const userMessage = `Product: ${productName}
Category: ${category || 'General'}
Description snippet: ${description.slice(0, 300)}`;

  let result;
  try {
    const raw = await callClaude(systemPrompt, userMessage, 256);
    const jsonStr = raw.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
    result = JSON.parse(jsonStr);
  } catch {
    res.status(500);
    throw new Error('Failed to parse AI response — please try again');
  }

  res.json({ success: true, ...result });
});

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
// General shopping assistant chat (supports multi-turn via messages array)
export const shopAssistantChat = asyncHandler(async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400);
    throw new Error('messages array is required');
  }

  // Validate message format
  const validRoles = ['user', 'assistant'];
  const sanitised = messages
    .filter((m) => validRoles.includes(m.role) && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    .slice(-20); // keep last 20 turns max

  if (sanitised.length === 0 || sanitised[sanitised.length - 1].role !== 'user') {
    res.status(400);
    throw new Error('Last message must be from the user');
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: `You are a helpful shopping assistant for Vendrix, an online marketplace.
Help customers find products, compare options, answer questions about orders and returns, and give gift recommendations.
Be concise, friendly, and honest. If you don't know something specific about Vendrix's inventory, say so rather than guessing.`,
    messages: sanitised,
  });

  res.json({
    success: true,
    message: response.content[0].text.trim(),
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  });
});
