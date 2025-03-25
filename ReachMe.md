Here’s a properly formatted **README.md** section for your project setup instructions:  

```md
## 🚀 Setup and Run the Application

### 1️⃣ Install MongoDB  
- Download and install **MongoDB Server** and **MongoDB Shell** from [MongoDB's official website](https://www.mongodb.com/try/download/community).  
- Configure MongoDB and add it to your system path.

### 2️⃣ Start MongoDB  
- Open **Command Prompt** as Administrator and run:  
  ```sh
  mongod
  ```
- Open another **Command Prompt** window and connect to MongoDB Shell:  
  ```sh
  mongosh
  ```

### 3️⃣ Clone the Repository  
- Run the following command to clone the project repository:  
  ```sh
  git clone <repository-url>
  ```

### 4️⃣ Run the Frontend  
- Navigate to the frontend directory:  
  ```sh
  cd invoice-generator/frontend
  ```
- Start the frontend development server:  
  ```sh
  npm run dev
  ```

### 5️⃣ Run the Backend  
- Open a new terminal and navigate to the backend directory:  
  ```sh
  cd ../backend
  ```
- Start the backend server using **nodemon**:  
  ```sh
  npx nodemon login.js
  ```

### 6️⃣ Push New Changes to GitHub  
- After making any changes, navigate to the root project directory:  
  ```sh
  cd ..
  ```
- Stage the changes:  
  ```sh
  git add .
  ```
- Commit the changes with a message:  
  ```sh
  git commit -m "Your commit message"
  ```
- Push the changes to the repository:  
  ```sh
  git push origin main
  ```

---
