import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    searchQuery: '',
    searchOpen: false,
    mobileMenuOpen: false,
    filterDrawerOpen: false,
  },
  reducers: {
    setSearchQuery(state, action)     { state.searchQuery = action.payload; },
    setSearchOpen(state, action)      { state.searchOpen = action.payload; },
    toggleMobileMenu(state)           { state.mobileMenuOpen = !state.mobileMenuOpen; },
    closeMobileMenu(state)            { state.mobileMenuOpen = false; },
    toggleFilterDrawer(state)         { state.filterDrawerOpen = !state.filterDrawerOpen; },
    closeFilterDrawer(state)          { state.filterDrawerOpen = false; },
  },
});

export const {
  setSearchQuery, setSearchOpen,
  toggleMobileMenu, closeMobileMenu,
  toggleFilterDrawer, closeFilterDrawer,
} = uiSlice.actions;

export const selectSearchQuery    = (state) => state.ui.searchQuery;
export const selectSearchOpen     = (state) => state.ui.searchOpen;
export const selectMobileMenuOpen = (state) => state.ui.mobileMenuOpen;
export const selectFilterDrawer   = (state) => state.ui.filterDrawerOpen;

export default uiSlice.reducer;
