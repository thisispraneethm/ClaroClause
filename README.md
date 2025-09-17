# ClaroClause 📜✨

**ClaroClause** is a privacy-focused, AI-powered web application that instantly simplifies complex legal documents. Paste any contract, policy, or legal text, and receive a simple, plain-English explanation, ensuring you understand the fine print without compromising your privacy.

This application is designed as a high-quality proof-of-concept demonstrating the power of on-device AI processing for sensitive information.

![ClaroClause Screenshot](https://storage.googleapis.com/aistudio-ux-team-public/claro_clause_screenshot.png)

---

## 🚀 Features

-   **Analyze Document**: Get a clause-by-clause breakdown of any legal text, complete with risk levels (High, Medium, Low) and a plain-English explanation.
-   **Chat with Document**: After analysis, ask the AI questions about the document in a conversational interface.
-   **Compare Documents**: See a side-by-side comparison of two document versions, highlighting what's been added, removed, or modified.
-   **Enhanced Analysis**: Tailor the AI's persona and focus areas (e.g., "explain like I'm 5" or "focus on liability") for more relevant results.
-   **100% Private**: Your documents are processed securely and are never stored. All analysis happens in your session.
-   **Session Persistence**: Your last analysis is saved locally in your browser, so you can pick up where you left off after a page reload.

---

## 🛠️ Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **AI**: Google Gemini API (`gemini-2.5-flash`)
-   **Animations**: Framer Motion
-   **Local Database**: Dexie.js (IndexedDB wrapper)
-   **Architecture**: `importmap` for CDN-based dependencies (See Security Warning below)

---

## 🏁 Getting Started

To run this project locally, follow these steps.

### Prerequisites

You need a modern web browser and a way to serve the files locally. A simple web server can be started with Python or Node.js.

-   **Node.js (for `npx serve`)**: Make sure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/claroclause.git
    cd claroclause
    ```

2.  **Create an environment file:**

    Create a file named `.env` in the root of the project and add your Google Gemini API key.

    ```ini
    # .env
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    *You can get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).*

3.  **Run a local web server:**

    Since this project uses ES modules directly in the browser, you just need a simple static server. You can use the `serve` package for this.

    ```bash
    # Run this command from the project root directory
    npx serve
    ```
    This will start a server, typically at `http://localhost:3000`. Open this URL in your browser to use the application.

---

## ⚠️ CRITICAL SECURITY WARNING

This application loads its dependencies (like React and Framer Motion) directly from a third-party CDN using an `importmap`. This approach has a significant, inherent security vulnerability for production environments.

**The `importmap` web standard DOES NOT support Subresource Integrity (SRI) hashes.**

### Risk

Without SRI, there is no way to verify the integrity of the loaded scripts. If the CDN provider is compromised, an attacker could inject malicious code into this application. This is a supply-chain attack that could be used to steal user data or perform other malicious actions.

### Recommended Architectural Fix

To mitigate this vulnerability for a production application, the architecture **MUST** be updated to remove the reliance on `importmap`. The industry-standard solution is to use a JavaScript bundler (e.g., **Vite**, **Webpack**, **Parcel**) to vendor all dependencies and build a single, secure application bundle.

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.