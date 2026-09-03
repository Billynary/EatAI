# Build context is the repository root.
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY deploy/nginx/proxy.conf /etc/nginx/conf.d/proxy.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
