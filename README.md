<<<<<<< HEAD
<<<<<<< HEAD

# job_application_nestJS

# Dự án Job Application xây dựng bằng NestJS là hệ thống backend cho nền tảng tuyển dụng, cho phép người dùng đăng ký, đăng nhập, tìm việc và nộp CV. Hệ thống quản lý ứng tuyển với các trạng thái và gửi email thông báo tự động, đảm bảo hiệu năng và dễ mở rộng.

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>
=======
# 📋 Job Application Platform
>>>>>>> master

> **Nền tảng quản lý đơn ứng tuyển thông minh với hỗ trợ AI**

![NestJS](https://img.shields.io/badge/NestJS-10.0-red?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue?style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-7.1-green?style=flat-square)
![License](https://img.shields.io/badge/License-UNLICENSED-yellow?style=flat-square)

---

## ✨ Chức năng Chính

### 🎯 Quản lý Người dùng & Xác thực

- ✅ Đăng ký, đăng nhập, xác thực JWT
- ✅ Hệ thống RBAC (Role-Based Access Control)
- ✅ Phân quyền chi tiết (Permissions Management)
- ✅ Hỗ trợ gói subscription (Subscription Plans)

### 📝 Quản lý Đơn Ứng Tuyển

- ✅ Tạo, cập nhật, xóa đơn ứng tuyển
- ✅ Theo dõi trạng thái (Draft → Submitted → Reviewing → Accepted/Rejected)
- ✅ Bộ lọc nâng cao & phân trang
- ✅ Quản lý CV & tệp đính kèm

### 🤖 AI & Xử lý Thông Minh

- ✅ **Trích xuất CV tự động**: Sử dụng Google Generative AI (Gemini) để phân tích CV
- ✅ **Khớp nối công việc**: Gợi ý công việc phù hợp dựa trên kỹ năng & kinh nghiệm
- ✅ **Tính điểm matching**: So sánh hồ sơ ứng viên với yêu cầu công việc

### 📂 Quản lý Tệp Đa Nền Tảng

- ✅ Upload CV, hình ảnh
- ✅ Hỗ trợ lưu trữ: Local, Cloudinary, Supabase
- ✅ Tự động xóa tệp cũ (Cleanup Job)
- ✅ Quản lý phân quyền truy cập

### 🏢 Quản lý Công Ty & Công Việc

- ✅ Tạo hồ sơ công ty
- ✅ Đăng tuyển công việc
- ✅ Xem danh sách ứng viên

### 🔐 Bảo Mật & Giám Sát

- ✅ Security headers (Helmet)
- ✅ Rate limiting (5 req/s, 50 req/min)
- ✅ Logging với Winston
- ✅ Daily rotate logs

---

## 🛠️ Công Nghệ Sử Dụng

### Backend Framework

| Công nghệ        | Mục đích                               |
| ---------------- | -------------------------------------- |
| **NestJS 10**    | Progressive Node.js framework          |
| **TypeScript 5** | Static typing & development experience |
| **Node.js**      | Runtime environment                    |

### Database & ORM

| Công nghệ        | Mục đích       |
| ---------------- | -------------- |
| **MongoDB 7.1**  | NoSQL database |
| **Mongoose 9.3** | MongoDB ODM    |

### Authentication & Authorization

| Công nghệ                | Mục đích                    |
| ------------------------ | --------------------------- |
| **Passport.js**          | Authentication middleware   |
| **JWT (JSON Web Token)** | Token-based authentication  |
| **BCrypt**               | Password hashing & security |

### AI & External Services

| Công nghệ                | Mục đích                     |
| ------------------------ | ---------------------------- |
| **Google Generative AI** | CV analysis & job matching   |
| **Cloudinary**           | Image storage & optimization |
| **Supabase**             | File storage & management    |

### File Processing

| Công nghệ     | Mục đích                      |
| ------------- | ----------------------------- |
| **pdf-parse** | PDF parsing & text extraction |
| **Multer**    | File upload handling          |

### API & Documentation

| Công nghệ           | Mục đích                      |
| ------------------- | ----------------------------- |
| **Swagger/OpenAPI** | Interactive API documentation |
| **Class Validator** | DTO validation                |

### Logging & Monitoring

| Công nghệ                     | Mục đích           |
| ----------------------------- | ------------------ |
| **Winston**                   | Structured logging |
| **Winston Daily Rotate File** | Log rotation       |

### Others

- **Helmet**: Security headers protection
- **Compression**: Response compression
- **Throttler**: Rate limiting
- **NestJS Schedule**: Scheduled tasks (cron jobs)

---

## 🚀 Hướng Dẫn Chạy Dự Án

### 📋 Yêu Cầu Trước

- **Node.js** >= 18.x
- **npm** hoặc **yarn**
- **MongoDB** (local hoặc cloud - MongoDB Atlas)

### 1️⃣ Cài Đặt Dependencies

```bash
# Clone repository
git clone <repository-url>
cd job-application

# Cài đặt packages
npm install
```

### 2️⃣ Cấu Hình Biến Môi Trường

Tạo file `.env.development` tại thư mục root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGO_URL=mongodb://localhost:27017/job-application

# JWT Authentication
JWT_SECRET=your_secret_key_here_minimum_32_characters_long
JWT_EXPIRATION=7d

# File Storage Configuration
IMAGE_STORAGE=LOCAL              # Tùy chọn: LOCAL, CLOUDINARY
FILE_STORAGE=LOCAL               # Tùy chọn: LOCAL, SUPABASE

# Cloudinary (nếu sử dụng)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Supabase (nếu sử dụng)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key

# Upload Settings
UPLOAD_FOLDER=./uploads
MAX_FILE_SIZE=10485760           # 10MB
```

### 3️⃣ Khởi Động MongoDB

```bash
# Nếu MongoDB đã cài local
mongod

# Hoặc sử dụng Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4️⃣ Chạy Ứng Dụng

```bash
# Development mode (auto reload)
npm run dev

# Xem tài liệu API
# Truy cập: http://localhost:3000/api/docs
```

### 5️⃣ Seeding Dữ Liệu Ban Đầu

```bash
# Chạy seed script để tạo:
# - Roles (Admin, User, Recruiter)
# - Permissions (create, read, update, delete)
# - Sample data
npm run seed
```

**Dữ liệu được tạo:**

- 3 Roles: Admin, Recruiter, User
- Sample Permissions cho mỗi role
- Database collection setup

---

## 📚 API Documentation

Sau khi chạy ứng dụng, truy cập Swagger UI:

```
http://localhost:3000/api/docs
```

### Các Endpoint Chính

#### 🔐 Authentication

```
POST   /api/v1/auth/register          - Đăng ký tài khoản
POST   /api/v1/auth/login             - Đăng nhập
POST   /api/v1/auth/refresh           - Làm mới token
POST   /api/v1/auth/logout            - Đăng xuất
```

#### 👥 Users

```
GET    /api/v1/users                  - Danh sách người dùng
GET    /api/v1/users/:id              - Chi tiết người dùng
PUT    /api/v1/users/:id              - Cập nhật thông tin
DELETE /api/v1/users/:id              - Xóa người dùng
```

#### 📝 Applications

```
GET    /api/v1/applications           - Danh sách đơn ứng tuyển
POST   /api/v1/applications           - Tạo đơn ứng tuyển
GET    /api/v1/applications/:id       - Chi tiết đơn
PATCH  /api/v1/applications/:id/status - Cập nhật trạng thái
DELETE /api/v1/applications/:id       - Xóa đơn
```

#### 📂 Files

```
POST   /api/v1/files/upload           - Upload tệp
GET    /api/v1/files/:id              - Thông tin tệp
DELETE /api/v1/files/:id              - Xóa tệp
```

#### 🤖 AI Services

```
POST   /api/v1/ai/extract-cv          - Trích xuất thông tin CV
POST   /api/v1/ai/match-jobs          - Gợi ý công việc phù hợp
```

---

## 📊 Các Lệnh Hữu Ích

```bash
# Development
npm run dev              # Chạy với auto-reload
npm run start:debug      # Debug mode

# Production
npm run build            # Build project
npm run start:prod       # Chạy production

# Testing
npm run test             # Unit tests
npm run test:watch       # Test watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests

# Code Quality
npm run lint             # Chạy ESLint
npm run format           # Format code với Prettier

# Database
npm run seed             # Seed dữ liệu ban đầu
```

---

## 🏗️ Cấu Trúc Dự Án

```
src/
├── ai/                    # Module AI & CV analysis
│   ├── services/          # ai-matching.service, cv-extract.service
│   └── providers/         # gemini.provider
├── application/           # Module quản lý đơn ứng tuyển
├── users/                 # Module quản lý người dùng
├── auth/                  # Module xác thực & authorization
├── jobs/                  # Module quản lý công việc
├── companies/             # Module quản lý công ty
├── files/                 # Module quản lý tệp
├── roles/                 # Module quản lý vai trò
├── permissions/           # Module quản lý phân quyền
├── upload/                # Module upload tệp
├── config/                # Cấu hình ứng dụng
├── common/                # Guards, decorators, interfaces
├── core/                  # Exception filters, interceptors
└── main.ts
```

---

## 🔒 Tính Năng Bảo Mật

✅ **JWT Authentication** - Token-based authentication
✅ **Password Hashing** - BCrypt với salt rounds
✅ **Rate Limiting** - Protection against DDoS
✅ **Helmet** - Security headers
✅ **Input Validation** - DTO validation
✅ **RBAC** - Role-based access control
✅ **Environment Variables** - No sensitive data in code

---

## 👨‍💻 Tác Giả

**[Your Name]**

- Email: your.email@example.com
- GitHub: [@yourprofile](https://github.com/yourprofile)
- LinkedIn: [Your LinkedIn Profile](https://linkedin.com/in/yourprofile)

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:

1. Kiểm tra logs tại `./logs`
2. Đảm bảo MongoDB đang chạy
3. Kiểm tra file `.env` configuration
4. Xem Swagger documentation: `http://localhost:3000/api/docs`

---

**Last Updated**: April 28, 2026

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

> > > > > > > master
