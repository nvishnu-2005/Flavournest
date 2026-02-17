import { useMemo, useState } from 'react';
import { defaultRecipes } from './data/defaultRecipes';

const USERS_KEY = 'flavornest_users';
const SESSION_KEY = 'flavornest_session';
const USER_RECIPES_KEY = 'flavornest_user_recipes';

const emptyRecipeForm = {
  title: '',
  country: 'India',
  ingredients: '',
  instructions: '',
  tags: '',
  image: ''
};

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
};

const getStoredUsers = () => safeParse(localStorage.getItem(USERS_KEY), []);
const getStoredSession = () => safeParse(localStorage.getItem(SESSION_KEY), null);
const getStoredUserRecipes = () => safeParse(localStorage.getItem(USER_RECIPES_KEY), []);

function App() {
  const [sessionUser, setSessionUser] = useState(getStoredSession());
  const [users, setUsers] = useState(getStoredUsers());
  const [userRecipes, setUserRecipes] = useState(getStoredUserRecipes());
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [recipeError, setRecipeError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');

  const allRecipes = useMemo(() => [...defaultRecipes, ...userRecipes], [userRecipes]);

  const countries = useMemo(() => {
    const merged = allRecipes.map((recipe) => recipe.country);
    return ['All', ...new Set(merged)].sort();
  }, [allRecipes]);

  const filteredRecipes = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return allRecipes.filter((recipe) => {
      const searchableText = `${recipe.title} ${recipe.tags.join(' ')} ${recipe.ingredients.join(' ')}`.toLowerCase();
      const matchesSearch = searchableText.includes(query);
      const matchesCountry = selectedCountry === 'All' || recipe.country === selectedCountry;
      return matchesSearch && matchesCountry;
    });
  }, [allRecipes, searchTerm, selectedCountry]);

  const persistUsers = (nextUsers) => {
    setUsers(nextUsers);
    localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  };

  const persistUserRecipes = (nextRecipes) => {
    setUserRecipes(nextRecipes);
    localStorage.setItem(USER_RECIPES_KEY, JSON.stringify(nextRecipes));
  };

  const persistSession = (user) => {
    setSessionUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();
    setAuthError('');

    const username = authForm.username.trim();
    const password = authForm.password.trim();

    if (!username || !password) {
      setAuthError('Username and password are required.');
      return;
    }

    if (isLoginView) {
      const existing = users.find((user) => user.username === username && user.password === password);
      if (!existing) {
        setAuthError('Invalid username or password.');
        return;
      }
      persistSession({ username: existing.username });
      setAuthForm({ username: '', password: '' });
      return;
    }

    if (users.some((user) => user.username === username)) {
      setAuthError('Username already exists. Please choose another.');
      return;
    }

    const nextUsers = [...users, { username, password }];
    persistUsers(nextUsers);
    persistSession({ username });
    setAuthForm({ username: '', password: '' });
  };

  const handleLogout = () => {
    setSessionUser(null);
    localStorage.removeItem(SESSION_KEY);
    setSearchTerm('');
    setSelectedCountry('All');
  };

  const handleAddRecipe = (event) => {
    event.preventDefault();
    setRecipeError('');

    const ingredients = recipeForm.ingredients
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const tags = recipeForm.tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!recipeForm.title.trim() || !recipeForm.country.trim() || ingredients.length === 0 || !recipeForm.instructions.trim()) {
      setRecipeError('Please provide title, country, ingredients, and instructions.');
      return;
    }

    const newRecipe = {
      id: `u-${Date.now()}`,
      title: recipeForm.title.trim(),
      country: recipeForm.country.trim(),
      ingredients,
      instructions: recipeForm.instructions.trim(),
      tags,
      image: recipeForm.image.trim() || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1000&q=80',
      owner: sessionUser.username
    };

    persistUserRecipes([newRecipe, ...userRecipes]);
    setRecipeForm(emptyRecipeForm);
  };

  const handleDeleteRecipe = (id) => {
    const recipe = userRecipes.find((item) => item.id === id);
    if (!recipe || recipe.owner !== sessionUser.username) {
      return;
    }

    const shouldDelete = window.confirm(`Delete recipe "${recipe.title}"?`);
    if (!shouldDelete) {
      return;
    }

    const nextRecipes = userRecipes.filter((item) => item.id !== id);
    persistUserRecipes(nextRecipes);
  };

  if (!sessionUser) {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <h1>FlavorNest 🍽️</h1>
          <p>Your personal recipe nest with global flavors.</p>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <input
              type="text"
              placeholder="Username"
              value={authForm.username}
              onChange={(event) => setAuthForm((prev) => ({ ...prev, username: event.target.value }))}
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            {authError && <p className="error">{authError}</p>}
            <button type="submit">{isLoginView ? 'Login' : 'Register'}</button>
          </form>

          <button type="button" className="text-button" onClick={() => setIsLoginView((prev) => !prev)}>
            {isLoginView ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <h1>FlavorNest</h1>
        <div className="nav-right">
          <span>Welcome, {sessionUser.username}</span>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard">
        <section className="controls">
          <input
            type="text"
            placeholder="Search by title, tags, ingredients..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </section>

        <section className="add-recipe">
          <h2>Add Your Recipe</h2>
          <form onSubmit={handleAddRecipe}>
            <div className="grid two">
              <input
                type="text"
                placeholder="Recipe title"
                value={recipeForm.title}
                onChange={(event) => setRecipeForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <input
                type="text"
                placeholder="Country"
                value={recipeForm.country}
                onChange={(event) => setRecipeForm((prev) => ({ ...prev, country: event.target.value }))}
              />
            </div>
            <input
              type="text"
              placeholder="Ingredients (comma separated)"
              value={recipeForm.ingredients}
              onChange={(event) => setRecipeForm((prev) => ({ ...prev, ingredients: event.target.value }))}
            />
            <textarea
              placeholder="Instructions"
              rows="4"
              value={recipeForm.instructions}
              onChange={(event) => setRecipeForm((prev) => ({ ...prev, instructions: event.target.value }))}
            />
            <div className="grid two">
              <input
                type="text"
                placeholder="Tags (comma separated)"
                value={recipeForm.tags}
                onChange={(event) => setRecipeForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
              <input
                type="url"
                placeholder="Image URL (optional)"
                value={recipeForm.image}
                onChange={(event) => setRecipeForm((prev) => ({ ...prev, image: event.target.value }))}
              />
            </div>
            {recipeError && <p className="error">{recipeError}</p>}
            <button type="submit">Add Recipe</button>
          </form>
        </section>

        <section>
          <h2>Recipe Dashboard</h2>
          <div className="recipe-grid">
            {filteredRecipes.map((recipe) => {
              const isOwned = recipe.owner === sessionUser.username;
              return (
                <article className="recipe-card" key={recipe.id}>
                  <img src={recipe.image} alt={recipe.title} />
                  <div className="recipe-content">
                    <h3>{recipe.title}</h3>
                    <p className="country">{recipe.country}</p>
                    <p>
                      <strong>Ingredients:</strong> {recipe.ingredients.join(', ')}
                    </p>
                    <p>
                      <strong>Instructions:</strong> {recipe.instructions}
                    </p>
                    <p>
                      <strong>Tags:</strong> {recipe.tags.join(', ') || 'None'}
                    </p>
                    {isOwned ? (
                      <button type="button" className="danger" onClick={() => handleDeleteRecipe(recipe.id)}>
                        Delete My Recipe
                      </button>
                    ) : (
                      <span className="chip">Default recipe</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {filteredRecipes.length === 0 && <p>No recipes found for current filters.</p>}
        </section>
      </main>
    </div>
  );
}

export default App;
