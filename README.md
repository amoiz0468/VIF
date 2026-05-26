# 🥖 Vif — The Real-Time Student Food Bridge

> Connecting French bakeries with students to turn end-of-day surplus into free, dignified meals — while rewarding bakeries with a tax benefit.

**EPITECH Capstone / Innovative Project · Paris, France**

---

## 📖 Overview

**Vif** is a mobile platform that solves two real problems at once:

- **Student food insecurity** — many students in France skip meals for financial reasons, and existing food aid is limited by fixed hours, fixed locations and social stigma.
- **Bakery food waste** — boulangeries discard large quantities of fresh, edible surplus every day, losing value and creating waste.

Vif is the missing real-time bridge between them. When a bakery has surplus, it posts a **"Pulse"** in one tap. Verified students within 1 km get an instant notification, reserve the food, and collect it for free through a secure QR handshake. The bakery reduces waste and receives a corporate tax reduction under French law — every stakeholder wins.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎓 **Student Verification** | OCR-based student ID verification; the ID image is discarded immediately after extraction (privacy by design). |
| ⚡ **The Pulse Engine** | One-click surplus posting for bakeries — under 10 seconds, no typing. |
| 📍 **Real-Time Geofencing** | Notifies verified students within a 1 km radius the moment a Pulse is posted. |
| ⏱️ **The Karma Engine** | A 20-minute claim timer and reliability system that keeps distribution fair. |
| 🔐 **Secure QR Handshake** | A challenge-response scan that confirms pickup and prevents fraud. |
| 🧾 **Automated Tax Documents** | Generates a monthly Cerfa-format donation document for the bakery's accountant. |

---

## 🛠️ Tech Stack

**Frontend (Mobile)**
- React Native / Expo (iOS & Android)
- React Native Maps, Vision-Camera

**Backend**
- FastAPI (Python)
- OAuth2 + JWT authentication
- WebSockets for real-time updates

**Database**
- PostgreSQL with the PostGIS extension (geospatial queries)
- SQLAlchemy ORM

**Other**
- Firebase Cloud Messaging (push notifications)
- TLS 1.3 encryption

---

## ⚖️ Legal Framework

Vif operates within established French and European law:

- **Article 238 bis CGI** — corporate donation tax reduction (the bakery incentive).
- **Loi n° 2016-138 ("Loi Garot")** — the French framework against food waste.
- **Cerfa n° 11580*05** — the official donation-receipt format Vif generates.
- **Regulation (EC) 852/2004** & **EU 1169/2011** — food hygiene and allergen information.
- **GDPR & CNIL guidance** — data protection and "privacy by design".

Donations are anchored through a partner **Organisme d'Intérêt Général (OIG)**.

---

## 📂 Documentation

This repository contains the complete project documentation set, organised into four families:

### Management & Strategy
- Project Charter
- Milestone 1 — Change Management & Stakeholder Strategy
- Milestone 2 — Change Implementation & Project Management
- Milestone 3 — Sustainability & Scaling Strategy
- Final Capstone Report
- Business Model & Cost Plan
- Communication & Awareness Plan
- Consolidated Risk Register

### Technical
- Vif API Specification & Technical Architecture
- Functional Specification (SRS)
- Database Schema & Data Dictionary
- Test Plan & QA Strategy
- Threat Model & Security Audit Plan

### Legal & Compliance
- Legal & Strategic Agreements
- Research & Draft Terms of Use

### User & Reference
- Personas & User Journeys
- User Manual & Onboarding Guide
- Glossary & Acronyms
- Documentation Index & Master Map

> 📌 **Start with the _Documentation Index & Master Map_** — it lists every document, explains how they connect, and gives a recommended reading order.

---

## 🚀 Project Status

Vif is an EPITECH capstone project delivered over a twelve-week, three-sprint cycle, validated through a controlled pilot in a single Paris zone before any wider rollout.

---

## 👥 Team


Delivered by a four-member engineering team organised by feature group (Auth & Security, Core API & Database, Mobile Core, Real-time & Geofencing).

---

## 📄 License

This project is developed for academic purposes as part of the EPITECH curriculum.
