# Backend Directory Walk-through
This directory contains our Node.js/Express backend application. Here's how it's organized:

## Core Structure
- `server.js`: The main entry point that sets up the Express server, middleware, and routes.
- Configures CORS, JSON parsing, and other server settings.
- Connects to the database.
- Registers all API routes.

## Key Directories
- `controllers/`: Business logic.
	- Each controller contains functions that process requests, interact with the database, and send responses.
	- `users.js`: Handles user-related operations like registration, login, and profile management.
- `routes/`: API endpoint definitions.
	- Each file defines the HTTP endpoints and connects them to the appropriate controller functions.
	- `users.js`: User-related routes (login, register, profile).
	- `budgets.js`: Budget management routes.
	- `transactions.js`: Transaction tracking routes.
	- `categories.js`: Category management routes.
- `middleware/`: Custom middleware.
	- Likely contains authentication middleware to protect routes.
	- May include error handling, logging, or request validation.
	- `config/`: Configuration files.
	- `database.js`: Database connection setup.
	- `reset.js`: Script to reset and initialize the database with tables.
	- `check-env.js`: Validates environment variables.
	- `dotenv.js`: Loads environment variables.

## Configuration Files
- `.env`: Environment variables for database credentials, JWT secret, etc.
- `.env.example`: Template for creating the `.env` file.
- `.gitignore`: Specifies files to exclude from version control.

# How Data Flows Through the Application
1. **Route Handling:** Express routes in the server receive the request.
2. **Middleware Processing:** Request passes through middleware (authentication, validation).
3. **Controller Logic:** Controller functions process the request and interact with the database.
4. **Database Operation:** Data is retrieved or modified in the MySQL database.
5. **Response:** Controller sends a response back to the frontend.

# Key Features and Their Implementation
## User Authentication
- Backend: JWT token generation, password hashing with bcrypt.
- Database: Users table storing credentials and profile information.
## Budget Management
- Backend: CRUD operations in `budgets` routes and controllers.
- Database: Budgets table linked to users.
## Transaction Tracking
- Backend: Transaction processing in `routes/transactions.js`.
- Database: Transactions table with foreign keys to users and categories.
## Category Management
- Backend: Category operations in `routes/categories.js`.
- Database: Categories table with user associations.

# Database Structure
The database is structured with several related tables:
1. **Users**: Stores user accounts and authentication information.
2. **Budgets**: Contains budget plans linked to users.
3. **Transactions**: Records financial transactions with category and user associations.
4. **Categories**: Defines transaction categories customized by users.
