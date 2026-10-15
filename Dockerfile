FROM node:24.14.0-alpine3.23 AS build

RUN apk add --no-cache git
WORKDIR /pdfjs
RUN git clone --depth 1 --branch v6.3.289 https://github.com/mozilla/pdf.js.git .
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --ignore-scripts
COPY scripts/patch-viewer.mjs /opt/patch-viewer.mjs
COPY viewer/origin-policy.js /opt/origin-policy.js
RUN node /opt/patch-viewer.mjs /pdfjs /opt/origin-policy.js \
    && npx gulp generic

FROM nginx:1.30.5-alpine3.24
RUN apk add --no-cache nodejs \
    && rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf
COPY --from=build /pdfjs/build/generic/ /usr/share/nginx/html/
COPY --from=build /pdfjs/LICENSE /usr/share/nginx/html/LICENSE
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY scripts/configure.mjs /opt/pdfjs/configure.mjs
COPY scripts/40-pdfjs-config.sh /docker-entrypoint.d/40-pdfjs-config.sh
RUN chmod +x /docker-entrypoint.d/40-pdfjs-config.sh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

