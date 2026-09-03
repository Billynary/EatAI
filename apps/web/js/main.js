// State
let state = {
  activeTab: 'inventory',
  foodItems: [],
  shoppingItems: [],
  mealPlans: [],
  recipes: [],
};

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
  initializeTabs();
  await fetchFoodItems();
  renderActiveTab();
  updateUI();
});

// Tabs
function initializeTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', function () {
      const tabId = this.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;

  // Update tab buttons
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.style.display = 'none';
  });
  document.getElementById(tabId).style.display = 'block';

  renderActiveTab();
}

function renderActiveTab() {
  switch (state.activeTab) {
    case 'inventory':
      renderFoodInventory();
      break;
    case 'recipes':
      renderRecipes();
      break;
    case 'shopping':
      renderShoppingList();
      break;
    case 'planner':
      renderMealPlanner();
      break;
  }
}

// Inventory
function renderFoodInventory() {
  sortFoodItems();
  updateExpirationAlert();
  renderFoodItems();
}

function sortFoodItems() {
  state.foodItems.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
}

function getDaysUntilExpiry(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(expiryDate) {
  const days = getDaysUntilExpiry(expiryDate);
  if (days < 0) return { status: 'expired', class: 'expired' };
  if (days <= 2) return { status: 'urgent', class: 'urgent' };
  if (days <= 5) return { status: 'warning', class: 'warning' };
  return { status: 'good', class: 'good' };
}

function updateExpirationAlert() {
  const expiringItems = state.foodItems.filter((item) => getDaysUntilExpiry(item.expiry_date) <= 2);
  const alert = document.getElementById('expirationAlert');
  const count = document.getElementById('expiringCount');

  if (expiringItems.length > 0) {
    alert.style.display = 'block';
    count.textContent = expiringItems.length;
  } else {
    alert.style.display = 'none';
  }
}

function renderFoodItems() {
  const grid = document.getElementById('foodItemsGrid');
  const emptyState = document.getElementById('foodEmptyState');

  if (state.foodItems.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  grid.innerHTML = state.foodItems
    .map((item) => {
      const expiryInfo = getExpiryStatus(item.expiry_date);
      const daysLeft = getDaysUntilExpiry(item.expiry_date);

      return `
            <div class="food-item ${expiryInfo.class}">
                <div class="food-item-header">
                    <div class="food-item-info">
                        <h3>${item.name}</h3>
                        <p>${item.quantity}</p>
                        ${item.category ? `<span class="food-item-category">${item.category}</span>` : ''}
                    </div>
                    <div class="food-item-actions">
                        <button class="icon-btn" onclick="editFoodItem(${item.id})">✏️</button>
                        <button class="icon-btn delete" onclick="deleteFoodItem(${item.id})">🗑️</button>
                    </div>
                </div>
                <div class="food-item-details">
                    <p>Expires: ${new Date(item.expiry_date).toLocaleDateString()}</p>
                    <p class="food-item-status">
                        ${
                          daysLeft < 0
                            ? `Expired ${Math.abs(daysLeft)} days ago`
                            : daysLeft === 0
                              ? 'Expires today!'
                              : `${daysLeft} days left`
                        }
                    </p>
                </div>
            </div>
        `;
    })
    .join('');
}

function toggleAddFoodForm() {
  const form = document.getElementById('addFoodForm');
  const btn = document.getElementById('addFoodBtn');

  if (form.style.display === 'none') {
    form.style.display = 'block';
    btn.style.display = 'none';
  } else {
    form.style.display = 'none';
    btn.style.display = 'block';
    clearFoodForm();
  }
}

function clearFoodForm() {
  document.getElementById('foodName').value = '';
  document.getElementById('foodQuantity').value = '';
  document.getElementById('foodExpiry').value = '';
  document.getElementById('foodCategory').value = '';
}

async function addFoodItem() {
  const name = document.getElementById('foodName').value;
  const quantity = document.getElementById('foodQuantity').value;
  const expiry = document.getElementById('foodExpiry').value;
  const category = document.getElementById('foodCategory').value;

  if (!name || !quantity) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  try {
    const response = await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        quantity,
        expiry_date: expiry || null,
        category,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Unknown error');
    }

    const addedItem = await response.json();
    state.foodItems.push(addedItem);
    renderFoodInventory();
    toggleAddFoodForm();
    showToast('Food item added successfully', 'success');
  } catch (error) {
    console.error('Error adding food:', error);
    showToast('Failed to add food item', 'error');
  }
}

async function deleteFoodItem(id) {
  try {
    const res = await fetch(`/api/food/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error('Delete failed');

    state.foodItems = state.foodItems.filter((item) => item.id !== id);
    renderFoodInventory();
    showToast('Food item deleted successfully', 'success');
  } catch (err) {
    console.error('Error deleting food:', err);
    showToast('Failed to delete food item', 'error');
  }
}

async function updateFoodItem(item) {
  try {
    const res = await fetch(`/api/food/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error();
    const updated = await res.json();
    const index = state.foodItems.findIndex((i) => i.id === item.id);
    if (index !== -1) state.foodItems[index] = updated;
    renderFoodInventory();
    showToast('Item updated', 'success');
  } catch {
    showToast('Update failed', 'error');
  }
}

function editFoodItem(id) {
  const item = state.foodItems.find((i) => i.id === id);
  if (!item) return;

  const newName = prompt('Food name:', item.name);
  if (newName === null) return;

  const newQuantity = prompt('Quantity:', item.quantity);
  if (newQuantity === null) return;

  const newExpiry = prompt('Expiry date (YYYY-MM-DD):', item.expiry_date || '');
  if (newExpiry === null) return;

  const newCategory = prompt('Category:', item.category || '');
  if (newCategory === null) return;

  item.name = newName || item.name;
  item.quantity = newQuantity || item.quantity;
  item.expiry_date = newExpiry || item.expiry_date;
  item.category = newCategory || item.category;

  updateFoodItem(item);
}

// Recipes
function renderRecipes() {
  updateAvailableIngredients();
  renderRecipesList();
}

function updateAvailableIngredients() {
  const container = document.getElementById('availableIngredients');
  const noIngredientsText = document.getElementById('noIngredientsText');

  if (state.foodItems.length === 0) {
    container.innerHTML = '';
    noIngredientsText.style.display = 'block';
  } else {
    noIngredientsText.style.display = 'none';
    container.innerHTML = state.foodItems
      .map((item) => `<span class="ingredient-tag">${item.name} (${item.quantity})</span>`)
      .join('');
  }
}

function renderRecipesList() {
  const container = document.getElementById('recipesList');
  const emptyState = document.getElementById('recipeEmptyState');
  const loading = document.getElementById('recipeLoading');

  if (state.recipes.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    loading.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    loading.style.display = 'none';
    container.innerHTML = state.recipes
      .map(
        (recipe) => `
            <div class="recipe-card">
                <div class="recipe-header">
                    <h3 class="recipe-title">${recipe.name}</h3>
                    <p class="recipe-description">${recipe.description}</p>
                    <div class="recipe-meta">
                        <div class="recipe-meta-item">
                            <span class="icon">⏱️</span>
                            ${recipe.cookTime}
                        </div>
                        <div class="recipe-meta-item">
                            <span class="icon">👥</span>
                            ${recipe.servings} servings
                        </div>
                        <span class="difficulty-badge difficulty-${(recipe.difficulty || 'unknown').toLowerCase()}">
                            ${recipe.difficulty || 'Unknown'}
                        </span>
                    </div>
                </div>
                
                <div class="recipe-content">
                    <div class="recipe-section">
                        <h4>Ingredients:</h4>
                        <ul class="recipe-ingredients">
                            ${recipe.ingredients.map((ing) => `<li>${ing}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="recipe-section">
                        <h4>Instructions:</h4>
                        <ol class="recipe-instructions">
                            ${recipe.instructions.map((inst) => `<li>${inst}</li>`).join('')}
                        </ol>
                    </div>
                </div>
                
                <button class="btn btn-purple btn-full" onclick="addToMealPlan(${recipe.id})">
                    Add to Meal Plan
                </button>
            </div>
        `,
      )
      .join('');
  }
}

async function generateRecipes() {
  const style = document.getElementById('recipeStyleInput').value;
  const allergies = document.getElementById('recipeAllergyInput').value;
  const servings = document.getElementById('recipeServingsInput').value;
  const cookTime = document.getElementById('recipeCookTimeInput').value;
  const difficulty = document.getElementById('recipeDifficultyInput').value;

  const requestData = {
    style,
    allergies,
    servings,
    cookTime,
    difficulty,
  };

  // Ladeanzeige
  document.getElementById('recipeLoading').style.display = 'block';
  document.getElementById('recipesList').innerHTML = '';
  document.getElementById('recipeEmptyState').style.display = 'none';

  try {
    const response = await fetch('/api/generate-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    const recipes = await response.json();
    state.recipes = recipes;
    renderRecipesList();
  } catch (err) {
    console.error('Recipe generation error:', err);
  } finally {
    document.getElementById('recipeLoading').style.display = 'none';
  }
}

function addToMealPlan(recipeId) {
  showToast('Recipe saved to meal planner!', 'success');
}

// Shopping
function renderShoppingList() {
  updateShoppingStats();
  renderShoppingItems();
}

function updateShoppingStats() {
  const pending = state.shoppingItems.filter((item) => !item.purchased);
  const purchased = state.shoppingItems.filter((item) => item.purchased);

  document.getElementById('pendingCount').textContent = pending.length;
  document.getElementById('purchasedCount').textContent = purchased.length;

  const clearBtn = document.getElementById('clearPurchasedBtn');
  clearBtn.style.display = purchased.length > 0 ? 'inline-block' : 'none';
}

function renderShoppingItems() {
  const pending = state.shoppingItems.filter((item) => !item.purchased);
  const purchased = state.shoppingItems.filter((item) => item.purchased);
  const emptyState = document.getElementById('shoppingEmptyState');

  // To Buy Section
  const toBuySection = document.getElementById('toBuySection');
  const toBuyList = document.getElementById('toBuyList');
  const toBuyCount = document.getElementById('toBuyCount');

  if (pending.length > 0) {
    toBuySection.style.display = 'block';
    toBuyCount.textContent = pending.length;
    toBuyList.innerHTML = pending
      .map(
        (item) => `
            <div class="shopping-item">
                <div class="shopping-item-content">
                    <input type="checkbox" class="shopping-checkbox" id="shop-${item.id}" 
                           onchange="toggleShoppingItem(${item.id})">
                    <label for="shop-${item.id}" class="shopping-label">${item.name}</label>
                </div>
                <button class="icon-btn delete" onclick="deleteShoppingItem(${item.id})">🗑️</button>
            </div>
        `,
      )
      .join('');
  } else {
    toBuySection.style.display = 'none';
  }

  // Purchased Section
  const purchasedSection = document.getElementById('purchasedSection');
  const purchasedList = document.getElementById('purchasedList');
  const purchasedCountSection = document.getElementById('purchasedCountSection');

  if (purchased.length > 0) {
    purchasedSection.style.display = 'block';
    purchasedCountSection.textContent = purchased.length;
    purchasedList.innerHTML = purchased
      .map(
        (item) => `
            <div class="shopping-item purchased">
                <div class="shopping-item-content">
                    <input type="checkbox" class="shopping-checkbox" id="shop-${item.id}" 
                           checked onchange="toggleShoppingItem(${item.id})">
                    <label for="shop-${item.id}" class="shopping-label">${item.name}</label>
                </div>
                <button class="icon-btn delete" onclick="deleteShoppingItem(${item.id})">🗑️</button>
            </div>
        `,
      )
      .join('');
  } else {
    purchasedSection.style.display = 'none';
  }

  // Empty state
  emptyState.style.display = state.shoppingItems.length === 0 ? 'block' : 'none';
}

function handleShoppingKeyPress(event) {
  if (event.key === 'Enter') {
    addShoppingItem();
  }
}

function addShoppingItem() {
  const input = document.getElementById('shoppingItemInput');
  const name = input.value.trim();

  if (!name) {
    showToast('Please enter an item name', 'error');
    return;
  }

  const newItem = {
    id: Date.now(),
    name,
    purchased: false,
    created_at: new Date().toISOString(),
  };

  state.shoppingItems.unshift(newItem);
  input.value = '';
  renderShoppingList();
  showToast('Item added to shopping list', 'success');
}

function toggleShoppingItem(id) {
  const item = state.shoppingItems.find((i) => i.id === id);
  if (item) {
    item.purchased = !item.purchased;
    renderShoppingList();
  }
}

function deleteShoppingItem(id) {
  state.shoppingItems = state.shoppingItems.filter((item) => item.id !== id);
  renderShoppingList();
  showToast('Item removed from shopping list', 'success');
}

function clearPurchased() {
  state.shoppingItems = state.shoppingItems.filter((item) => !item.purchased);
  renderShoppingList();
  showToast('Purchased items cleared', 'success');
}

function quickAddItem(itemName) {
  const exists = state.shoppingItems.some(
    (item) => item.name.toLowerCase() === itemName.toLowerCase(),
  );

  if (!exists) {
    const newItem = {
      id: Date.now(),
      name: itemName,
      purchased: false,
      created_at: new Date().toISOString(),
    };
    state.shoppingItems.unshift(newItem);
    renderShoppingList();
    showToast(`${itemName} added to shopping list`, 'success');
  } else {
    showToast(`${itemName} is already in your list`, 'info');
  }
}

// Planner
function renderMealPlanner() {
  renderWeeklyCalendar();
  renderWeeklySummary();
  renderTodaysMeals();
}

function renderWeeklyCalendar() {
  const container = document.getElementById('weeklyCalendar');
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  container.innerHTML = daysOfWeek
    .map((day, index) => {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay() + index + 1);

      return `
            <div class="day-card">
                <div class="day-header">
                    <div class="day-name">${day}</div>
                    <div class="day-date">${date.toLocaleDateString()}</div>
                </div>
                <div class="meal-slots">
                    ${mealTypes
                      .map((mealType) => {
                        const meal = state.mealPlans.find(
                          (m) => m.day === day && m.meal === mealType,
                        );

                        return `
                            <div class="meal-slot">
                                <div class="meal-type">${mealType}</div>
                                ${
                                  meal
                                    ? `
                                    <div class="meal-item">
                                        <div class="meal-item-header">
                                            <div class="meal-item-info">
                                                <div class="meal-name">${meal.recipe}</div>
                                                <div class="meal-time">
                                                    <span class="icon">⏰</span>
                                                    ${meal.time}
                                                </div>
                                            </div>
                                            <button class="meal-remove" onclick="removeMealPlan(${meal.id})">×</button>
                                        </div>
                                    </div>
                                `
                                    : `
                                    <button class="add-meal-btn" onclick="addMealPlan('${day}', '${mealType}')">
                                        + Add ${mealType}
                                    </button>
                                `
                                }
                            </div>
                        `;
                      })
                      .join('')}
                </div>
            </div>
        `;
    })
    .join('');
}

function renderWeeklySummary() {
  // Update stats
  const plannedMeals = state.mealPlans.length;
  const completionPercent = Math.round((plannedMeals / 28) * 100);

  document.getElementById('plannedMeals').textContent = plannedMeals;
  document.getElementById('completionPercent').textContent = completionPercent;
  document.getElementById('progressFill').style.width = `${completionPercent}%`;

  const ingredients = [];
  const container = document.getElementById('weeklyIngredients');

  container.innerHTML = ingredients
    .map(
      (ingredient) => `
        <div class="ingredient-item">
            <span class="ingredient-name">${ingredient}</span>
            <button class="btn btn-small btn-outline" onclick="addIngredientToShopping('${ingredient}')">
                Add to Shopping
            </button>
        </div>
    `,
    )
    .join('');
}

function renderTodaysMeals() {
  const today = 'Monday';
  const todaysMeals = state.mealPlans.filter((plan) => plan.day === today);
  const container = document.getElementById('todaysMeals');
  const noMealsText = document.getElementById('noMealsToday');

  if (todaysMeals.length === 0) {
    container.innerHTML = '';
    noMealsText.style.display = 'block';
  } else {
    noMealsText.style.display = 'none';
    container.innerHTML = todaysMeals
      .map(
        (meal) => `
            <div class="today-meal-card">
                <div class="today-meal-header">
                    <span class="today-meal-type">${meal.meal}</span>
                    <span class="today-meal-time">${meal.time}</span>
                </div>
                <div class="today-meal-name">${meal.recipe}</div>
            </div>
        `,
      )
      .join('');
  }
}

function addMealPlan(day, mealType) {
  showToast('Recipe selection modal would open here', 'info');
}

function removeMealPlan(id) {
  state.mealPlans = state.mealPlans.filter((plan) => plan.id !== id);
  renderMealPlanner();
  showToast('Meal removed from planner', 'success');
}

function addIngredientToShopping(ingredient) {
  const itemName = ingredient.split(' (')[0]; // Remove quantity from name
  quickAddItem(itemName);
}

function autoFillWeek() {
  showToast('Auto-fill feature coming soon!', 'info');
}

// Toasts
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function fetchFoodItems() {
  try {
    const response = await fetch('/api/food');
    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error('Unexpected backend response:', data);
      showToast('Invalid server data', 'error');
      return;
    }

    state.foodItems = data;
    renderFoodInventory();
  } catch (error) {
    console.error('Error loading food items:', error);
    showToast('Failed to load food items', 'error');
  }
}

async function generateRecipes() {
  const loading = document.getElementById('recipeLoading');
  const emptyState = document.getElementById('recipeEmptyState');

  loading.style.display = 'block';
  emptyState.style.display = 'none';

  try {
    const styleInput = document.getElementById('recipeStyleInput')?.value || 'standard';
    const allergyInput = document.getElementById('recipeAllergyInput')?.value || '';

    const response = await fetch('/api/generate-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        style: styleInput,
        allergies: allergyInput,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Unknown error');
    }

    const data = await response.json();

    state.recipes = Array.isArray(data) ? data : [data];

    renderRecipesList();
    showToast('Recipes generated from your ingredients!', 'success');
  } catch (err) {
    console.error('Recipe generation error:', err);
    showToast('Failed to generate recipes', 'error');
  } finally {
    loading.style.display = 'none';
  }
}

// UI
function updateUI() {
  document.getElementById('addFoodBtn').addEventListener('click', toggleAddFoodForm);
}

// Animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
