"""QR code generator for contacts (vCard format)."""
import io
import base64
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer


def generate_vcard_qr(contact_data: dict) -> str:
    """Generate a QR code containing vCard data. Returns base64 PNG."""
    name = contact_data.get("name", "")
    phone = contact_data.get("phone", "")
    email = contact_data.get("email", "")
    company = contact_data.get("company", "")
    title = contact_data.get("job_title", "")

    vcard = f"""BEGIN:VCARD
VERSION:3.0
FN:{name}
N:{name};;;;
TEL:{phone}
EMAIL:{email}
ORG:{company}
TITLE:{title}
END:VCARD"""

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(vcard.strip())
    qr.make(fit=True)

    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        fill_color="#6366f1",
        back_color="white",
    )

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return "data:image/png;base64," + base64.b64encode(buf.read()).decode()
