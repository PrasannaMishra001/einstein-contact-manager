import cloudinary
import cloudinary.uploader
from app.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


async def upload_photo(file_bytes: bytes, public_id: str) -> str:
    """Upload photo to Cloudinary and return the secure URL."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        return ""
    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
                {"quality": "auto", "fetch_format": "auto"},
            ],
        )
        return result.get("secure_url", "")
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return ""


async def delete_photo(photo_url: str):
    """Delete photo from Cloudinary by URL."""
    if not settings.CLOUDINARY_CLOUD_NAME or not photo_url:
        return
    try:
        # Extract public_id from URL
        parts = photo_url.split("/upload/")
        if len(parts) == 2:
            public_id = parts[1].rsplit(".", 1)[0]
            cloudinary.uploader.destroy(public_id)
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
