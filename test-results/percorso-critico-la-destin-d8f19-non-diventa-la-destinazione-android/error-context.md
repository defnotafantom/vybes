# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: percorso-critico.spec.ts >> la destinazione non può portare fuori dal sito >> «/\vybes-fake.example» non diventa la destinazione
- Location: tests\e2e\percorso-critico.spec.ts:81:9

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\bucca\AppData\Local\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```