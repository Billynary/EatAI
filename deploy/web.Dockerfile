# Build context is the repository root.
FROM nginx:alpine

COPY apps/web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
