const path = require("path");
const fs = require("fs");

// Compile TypeScript on the fly using ts-node or run via compiled ts
const { PDFParserService } = require("./dist-scripts/pdf-parser");
const { LocalStorageAdapter } = require("./dist-scripts/storage");
