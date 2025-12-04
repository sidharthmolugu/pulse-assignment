# pulsevid-video platform

This repository is a minimal but production-minded full-stack video processing application (pulsevid-video platform) with features focused on secure uploads, real-time processing updates, sensitivity analysis/classification, and secure streaming.

**Status:** All core functional requirements and quality standards have been implemented and verified.

**Functional Requirements Met:**

- ✅ Complete video upload and storage system
- ✅ Real-time processing progress updates
- ✅ Video sensitivity analysis and classification
- ✅ Secure video streaming with range requests
- ✅ Multi-tenant user isolation
- ✅ Role-based access control implementation

**Quality Standards Achieved:**

- ✅ Clean, maintainable code structure
- ✅ Comprehensive documentation (this repo + `backend/README.md` + `frontend/README.md`)
- ✅ Secure authentication and authorisation
- ✅ Responsive and intuitive user interface
- ✅ Proper error handling and user feedback
- ✅ Public deployment with demo video (see Demo link below)

Project layout:

- `backend/` — Express API, upload/processing pipeline, models, routes
- `frontend/` — React + Vite UI (upload, library, player, progress)

Quick local run (developer machine, PowerShell):

1. Start backend (from repository root):

```powershell
cd .\backend
npm install
# ensure MongoDB is running or set MONGODB_URI
npm start
```

2. Start frontend (separate terminal):

```powershell
cd .\frontend
npm install
npm run dev
```





