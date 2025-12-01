from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .products import products

app = FastAPI()

@app.get("/api/products")
async def get_products():
    return products



# Mount the frontend directory to serve static files
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Serve index.html at root
@app.get("/")
async def read_index():
    return FileResponse('frontend/index.html')



# Serve other static files that might be requested relative to root if needed
# But since we moved everything to frontend, we might need to adjust how index.html references them.
# If index.html references "styles.css", it will look at /styles.css.
# So we need to serve those files too.

@app.get("/{filename}")
async def serve_frontend_file(filename: str):
    # Basic security check to prevent directory traversal
    if ".." in filename or "/" in filename:
        return FileResponse('frontend/index.html') # Fallback or 404
    
    import os
    file_path = os.path.join("frontend", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse('frontend/index.html') # Fallback for SPA routing if we had it, or just 404
