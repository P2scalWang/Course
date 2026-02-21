# 🎓 CourseFlow (Course Management & LINE LIFF System)

![CourseFlow Banner](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase)
![LINE LIFF](https://img.shields.io/badge/LINE_LIFF-Integration-00C300?style=for-the-badge&logo=line)

**CourseFlow** is a modern, comprehensive course management and registration system built with React, Vite, Tailwind CSS, Firebase, and LINE LIFF. 

It provides a seamless, mobile-first experience for **Students/Trainees** interacting via the LINE app, and a robust desktop dashboard for **Administrators** managing the courses.

---

## ✨ Features

### 👨‍💼 For Administrators (Admin Panel)
- **Course Management:** Create, update, and manage training courses.
- **Dynamic Form Builder:** Build custom forms and assessments for specific courses.
- **Trainee Tracking:** Track trainee progress, registration status, and activity.
- **Response Management:** View, analyze, and manage responses submitted by trainees to assessments.
- **Data Export:** Easily export course data and responses to Excel formats (`.xlsx`).

### 📱 For Users (LINE LIFF App)
- **Seamless Authentication:** Integrated with LINE Login via LIFF (No separate account creation needed).
- **Course Registration:** Register for new courses securely using custom access keys.
- **My Courses:** View registered courses, schedules, and training details.
- **Assessments & Forms:** Fill out and submit course-related assessments seamlessly within the LINE app.
- **Profile Management:** View and manage user profiles dynamically.

---

## 🛠️ Technology Stack

- **Frontend Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend & Database:** [Firebase](https://firebase.google.com/) (Firestore)
- **Integration:** [LINE LIFF](https://developers.line.biz/en/docs/liff/) (For LINE Mini App experience)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Utilities:** `exceljs`, `xlsx`, `file-saver`, `clsx`, `tailwind-merge`

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Firebase Project](https://console.firebase.google.com/) for database and hosting.
- A [LINE Developers](https://developers.line.biz/) account and a registered LIFF App.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/P2scalWang/Course.git
   cd Course/course-flow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your environment configurations:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_LIFF_ID=your_line_liff_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

---

## 📂 Project Structure

```text
src/
├── components/      # Reusable UI components (Buttons, Inputs, Modals)
├── layouts/         # Layout components (AdminLayout, LiffLayout)
├── pages/           # Application pages
│   ├── admin/       # Administrator dashboard pages (CourseManage, FormBuilder, etc.)
│   └── liff/        # LINE LIFF user-facing pages (Home, MyCourses, Profile, etc.)
├── services/        # Service layer handling logic/API calls (Firebase, LIFF, etc.)
└── lib/             # Third-party configurations (e.g., Firebase init)
```

---

## 🎨 UI/UX Design
The application focuses on an intuitive layout:
- **Admin Panel** uses a clean, expansive layout suitable for desktop usage.
- **LIFF App** uses a mobile-first, rounded, and playful aesthetic that natively blends within the LINE Chat context.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
