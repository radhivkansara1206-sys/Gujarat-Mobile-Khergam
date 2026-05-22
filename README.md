# Gujarat Mobile Khergam Accessories - Stock Management System

A custom-built, modern web application designed for **Gujarat Mobile Khergam** to easily manage their accessory stock, record daily sales, and track complimentary gifts. 

🌐 **Live Demo / Production:** [https://yes-eight-omega.vercel.app](https://yes-eight-omega.vercel.app)

## 🚀 Features

- **Inventory Management**: Create categories, add new accessories, set pricing, and track exact stock levels.
- **Low Stock Alerts**: Automatically highlights items that are running out of stock so you never miss a sale.
- **Point of Sale (POS)**: Quickly record sales (Cash or Online) with a few clicks. Stock is automatically deducted!
- **Gift Tracking**: Record when accessories are given away as gifts to track outgoing inventory without recording revenue.
- **Role-Based Access**: 
  - **Admins** have full access to manage inventory, edit categories, and create staff accounts.
  - **Staff** can easily record sales and view inventory.
- **Secure Cloud Database**: Powered by PostgreSQL (via Neon) ensuring data is safe, fast, and always backed up.

## 💻 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL (hosted on [Neon](https://neon.tech/))
- **Styling**: Vanilla CSS with custom modern variables & responsive mobile design
- **Hosting**: [Vercel](https://vercel.com/)

## 🛠 Local Setup

If you want to run this project on your local machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/radhivkansara1206-sys/Gujarat-Mobile-Khergam.git
   cd Gujarat-Mobile-Khergam
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add the following:
   ```env
   DATABASE_URL="postgresql://user:password@host/database"
   AUTH_SECRET="your-secure-random-string-here"
   ```

4. **Initialize the database:**
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```
   *(Note: The seed script will create the default admin account: `admin@gujaratmobile.com` / `admin123`)*

5. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔒 Deployment

This application is configured for seamless deployment on Vercel. 
Simply link the repository to a new Vercel project, add your `.env` variables in the Vercel dashboard, and click Deploy!

---
*Built for Gujarat Mobile Khergam*
