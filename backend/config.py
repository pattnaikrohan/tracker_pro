import os

# Frontend URLs that are allowed to access this API (CORS)
# You can easily add more URLs here or set the FRONTEND_URL environment variable in Azure
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://black-pebble-080918a00.7.azurestaticapps.net"
]

# Add URL from environment variable if it exists
env_origin = os.environ.get("FRONTEND_URL")
if env_origin:
    ALLOWED_ORIGINS.append(env_origin)
