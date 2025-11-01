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

This application is designed to be deployed to a hosting environment that can securely provide the necessary Google Gemini API key.

### Prerequisites

- A Google Gemini API key. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).
- A hosting platform capable of injecting environment variables into the static site's execution context.

### Environment Configuration

The application requires the `API_KEY` to be available as `process.env.API_KEY` in the browser's JavaScript context. This is a hard requirement and must be configured by the hosting environment.

**This application will not function correctly if served as simple static files from a local server without a mechanism to provide the API key.** The local setup instructions below are for previewing the UI only; the AI features will not work.

### Local UI Preview (without AI functionality)

If you wish to preview the static UI components locally, you can use a simple web server.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/claroclause.git
    cd claroclause
    ```
2.  **Run a local server:**
    Ensure you have Node.js installed, then run:
    ```bash
    # From the project root directory
    npx serve
    ```
    This will start a server (e.g., at `http://localhost:3000`). Opening this URL will show the application UI, but any action requiring the Gemini API will fail due to the missing API key.

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