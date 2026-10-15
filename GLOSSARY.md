# PDF Viewer

This context describes a hosted PDF viewer and the PDF sources it accepts.

## Language

**Viewer origin**:
The scheme, hostname, and port of the website that serves the PDF viewer.
_Avoid_: Main domain

**PDF source origin**:
The scheme, hostname, and port of the website that serves a PDF file.
_Avoid_: PDF domain, file domain

**Allowed PDF source origin**:
A PDF source origin that the viewer's policy permits.
_Avoid_: Allowed origin without the PDF source qualifier
