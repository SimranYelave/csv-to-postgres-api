# CSV to PostgreSQL User Management System

A Node.js application that converts CSV files to JSON and stores user data in PostgreSQL with age distribution analytics.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [CSV Format](#csv-format)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- ✅ CSV to JSON conversion without external parser libraries
- ✅ Support for nested object notation (dot notation)
- ✅ PostgreSQL database integration with JSONB support
- ✅ Batch insert for handling 50k+ records efficiently
- ✅ Age distribution analytics with visual console reports
- ✅ RESTful API endpoints

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** or **yarn** package manager
- **Git** - [Download](https://git-scm.com/)

### Check Installed Versions

```bash
node --version
npm --version
psql --version
```

## 📥 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/csv-postgres-app.git
cd csv-postgres-app
```

### 2. Install Dependencies

```bash
npm install
```

Required packages:
```bash
npm install express pg dotenv cors
```

**package.json dependencies:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  }
}
```

## 🗄️ Database Setup

### Step 1: Install PostgreSQL

#### On Windows:
1. Download installer from [PostgreSQL Official Website](https://www.postgresql.org/download/windows/)
2. Run installer and follow the setup wizard
3. Remember your superuser password
4. Default port is 5432

#### On macOS:
```bash
brew install postgresql
brew services start postgresql
```

#### On Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Access PostgreSQL

#### Windows:
- Open **pgAdmin 4** or **SQL Shell (psql)**

#### macOS/Linux:
```bash
sudo -u postgres psql
```

Or connect as your user:
```bash
psql -U postgres
```

### Step 3: Create Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create a new database
CREATE DATABASE csv_user_db;

-- List all databases to verify
\l

-- Connect to the new database
\c csv_user_db
```

### Step 4: Create Users Table

```sql
-- Create the users table
CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  age INT NOT NULL,
  address JSONB NULL,
  additional_info JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verify table creation
\dt

-- View table structure
\d public.users
```


## ⚙️ Environment Configuration

### Create `.env` file

Create a `.env` file in the root directory:

```bash
touch .env
```

Add the following configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# PostgreSQL Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=csv_user_db
DB_PASSWORD=your_password_here
DB_PORT=5432

# Optional: Connection Pool Settings
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

**⚠️ Important:** Replace `your_password_here` with your actual PostgreSQL password.


## 📁 Project Structure

```
csv-postgres-app/
│
├── src/
│   ├── config/
│   │   └── database.js
│   │
│   ├── controllers/
│   │   ├── csvtojsonController.js     # CSV → JSON + DB Insert
│   │   └── reportController.js        # Generate age-group distribution
│   │
│   ├── routes/
│   │   └── upload.routes.js           # API routes
│   │
│   └── app.js                         # Express app entry
│
├── .env
├── package.json
└── README.md
```

## 🚀 Running the Application

### Start the Server

```bash
node src/app.js
```

Or for development with auto-reload:

```bash
npm install -g nodemon
nodemon src/app.js
```

Expected output:
```
🚀 Server is running on http://localhost:3000
📊 API endpoints available at http://localhost:3000/api
```

## 📡 API Endpoints

### 1. Upload CSV Data

**Endpoint:** `POST /api/convert-csv`

**Request Body:**
```json
{
  "csvData": "name.firstName,name.lastName,age,address.line1,address.city,address.state,gender\nRohit,Prasad,35,A-563 Rakshak Society,Pune,Maharashtra,male\nPriya,Sharma,28,B-102 Green Valley,Mumbai,Maharashtra,female"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed and inserted 2 records",
  "totalRecords": 2,
  "sampleRecord": {
    "name": "Rohit Prasad",
    "age": 35,
    "address": {
      "line1": "A-563 Rakshak Society",
      "city": "Pune",
      "state": "Maharashtra"
    },
    "additional_info": {
      "gender": "male",
      "phone" : "555-6340"
    }
  }
}
```

### 2. Generate Age Distribution Report

**Endpoint:** `GET /api/age-distribution`

**Response (JSON):**
```json
{
  "success": true,
  "message": "Age distribution report generated successfully",
  "totalUsers": 1000,
  "distribution": {
    "below20": { "count": 200, "percentage": 20 },
    "20to40": { "count": 450, "percentage": 45 },
    "40to60": { "count": 250, "percentage": 25 },
    "above60": { "count": 100, "percentage": 10 }
  }
}
```

**Console Output:**
```
Processing CSV file: 2.74 MB
Parsed 50000 records, transforming to DB format...
Inserting 50000 records into database...
Progress: 5000/50000 records inserted
Progress: 10000/50000 records inserted
Progress: 15000/50000 records inserted
Progress: 20000/50000 records inserted
Progress: 25000/50000 records inserted
Progress: 30000/50000 records inserted
Progress: 35000/50000 records inserted
Progress: 40000/50000 records inserted
Progress: 45000/50000 records inserted
Progress: 50000/50000 records inserted
✅ Completed in 2.10s - Inserted 50000 records

======================================================================
                    AGE DISTRIBUTION REPORT
======================================================================
Total Users: 50000
======================================================================

┌─────────────────────┬──────────────┬─────────────────┬─────────────────┐
│ Age Group           │ Count        │ % Distribution  │ Visual Bar      │
├─────────────────────┼──────────────┼─────────────────┼─────────────────┤
│ < 20                │ 1507         │ 3.01%           │ ██              │
├─────────────────────┼──────────────┼─────────────────┼─────────────────┤
│ 20 - 40             │ 14881        │ 29.76%          │ ███████████████ │
├─────────────────────┼──────────────┼─────────────────┼─────────────────┤
│ 40 - 60             │ 14291        │ 28.58%          │ ██████████████  │
├─────────────────────┼──────────────┼─────────────────┼─────────────────┤
│ > 60                │ 19321        │ 38.64%          │ ███████████████████ │
└─────────────────────┴──────────────┴─────────────────┴─────────────────┘

======================================================================

📊 SIMPLE FORMAT:
────────────────────────────────────────
Age Group      % Distribution
────────────────────────────────────────
< 20           3.01%
20 to 40       29.76%
40 to 60       28.58%
> 60           38.64%
────────────────────────────────────────
```

## 📝 Usage Examples

### Using cURL

#### convert CSV:
```bash
curl http://localhost:3000/api/convert-csv
```

#### Get Age Distribution:
```bash
curl http://localhost:3000/api/age-distribution
```

### Using Postman

1. **convert CSV:**
   - Method: GET
   - URL: `http://localhost:3000/api/convert-csv`

2. **Generate Report:**
   - Method: GET
   - URL: `http://localhost:3000/api/age-distribution`

## 📄 CSV Format

### Sample Format

```csv
name.firstName,name.lastName,age,address.line1,address.city,address.state,gender,phone
Rohit,Prasad,35,A-563 Rakshak Society,Pune,Maharashtra,male,555-6548
Priya,Sharma,28,B-102 Green Valley,Mumbai,Maharashtra,female,654-8451
Amit,Kumar,42,C-201 Sunrise Apartments,Delhi,Delhi,male,456-8412
```

### Supported Features

- ✅ Dot notation for nested objects (e.g., `name.firstName`)
- ✅ Automatic type conversion (numbers, booleans)
- ✅ Quoted values with commas
- ✅ Empty values
- ✅ Additional fields (stored in `additional_info`)

### Mapping Logic

| CSV Column | Database Column | Type | Notes |
|------------|----------------|------|-------|
| `name.firstName` + `name.lastName` | `name` | VARCHAR | Combined |
| `age` | `age` | INT | Direct mapping |
| `address.*` | `address` | JSONB | Nested object |
| Other fields | `additional_info` | JSONB | Extra fields |

## 🔍 Testing the Setup

### 1. Test Database Connection

```bash
psql -U postgres -d csv_user_db -c "SELECT version();"
```

### 2. Test API Health

```bash
curl http://localhost:3000/
```

### 3. Check Table

```sql
psql -U postgres -d csv_user_db

SELECT * FROM public.users;
```

## 🐛 Troubleshooting

### Issue: "relation 'public.users' does not exist"

**Solution:**
```sql
-- Connect to database and create table
psql -U postgres -d csv_user_db
CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  age INT NOT NULL,
  address JSONB NULL,
  additional_info JSONB NULL
);
```

### Issue: "password authentication failed"

**Solution:**
1. Check your `.env` file has correct password
2. Reset PostgreSQL password:
```sql
ALTER USER postgres PASSWORD 'new_password';
```

### Issue: "Port 3000 already in use"

**Solution:**
- Change PORT in `.env` file
- Or kill the process:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Issue: "Cannot connect to PostgreSQL"

**Solution:**
1. Check if PostgreSQL is running:
```bash
# Windows
services.msc (look for postgresql)

# macOS
brew services list

# Linux
sudo systemctl status postgresql
```

2. Start PostgreSQL:
```bash
# Windows - Start from Services

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Issue: Large CSV files causing timeout

**Solution:**
- Increase batch size in controller (default: 1000)
- Increase request timeout and body size limits in server.js
- Use database connection pooling (already implemented)

## 📚 Additional Commands

### PostgreSQL Useful Commands

```sql
-- List all databases
\l

-- Connect to database
\c csv_user_db

-- List all tables
\dt

-- Describe table structure
\d public.users

-- View all data
SELECT * FROM public.users;

-- Count records
SELECT COUNT(*) FROM public.users;

-- Delete all data
TRUNCATE TABLE public.users RESTART IDENTITY;

-- Drop table
DROP TABLE public.users;

-- Exit psql
\q
```


## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 👤 Author

Your Name - simranyelave064@gmail.com

## 🙏 Acknowledgments

- Express.js for the web framework
- PostgreSQL for the database
- Node.js community

---

**Need Help?** Open an issue on GitHub or contact the maintainer.

**Happy Coding! 🚀**