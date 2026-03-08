"""API client for connecting the CLI to the Einstein backend."""
import os
import json
import requests
from typing import Optional

CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".einstein_cli.json")


def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_config(data: dict):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save config: {e}")


class EinsteinAPIClient:
    def __init__(self, base_url: Optional[str] = None):
        cfg = load_config()
        self.base_url = (base_url or cfg.get("api_url", "http://localhost:8000")).rstrip("/")
        self.token = cfg.get("access_token")
        self.refresh_token_val = cfg.get("refresh_token")

    @property
    def headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        url = f"{self.base_url}/api{path}"
        resp = requests.request(method, url, headers=self.headers, timeout=10, **kwargs)
        if resp.status_code == 401 and self.refresh_token_val:
            self._refresh()
            resp = requests.request(method, url, headers=self.headers, timeout=10, **kwargs)
        return resp

    def _refresh(self):
        try:
            resp = requests.post(
                f"{self.base_url}/api/auth/refresh",
                json={"refresh_token": self.refresh_token_val},
                timeout=10,
            )
            if resp.ok:
                data = resp.json()
                self.token = data["access_token"]
                self.refresh_token_val = data["refresh_token"]
                cfg = load_config()
                cfg["access_token"] = self.token
                cfg["refresh_token"] = self.refresh_token_val
                save_config(cfg)
        except Exception:
            pass

    def is_connected(self) -> bool:
        try:
            resp = requests.get(f"{self.base_url}/health", timeout=3)
            return resp.ok
        except Exception:
            return False

    def login(self, email: str, password: str) -> bool:
        try:
            resp = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"email": email, "password": password},
                timeout=10,
            )
            if resp.ok:
                data = resp.json()
                self.token = data["access_token"]
                self.refresh_token_val = data["refresh_token"]
                cfg = load_config()
                cfg.update({"api_url": self.base_url, "access_token": self.token, "refresh_token": self.refresh_token_val})
                save_config(cfg)
                return True
        except Exception as e:
            print(f"Login error: {e}")
        return False

    def logout(self):
        cfg = load_config()
        cfg.pop("access_token", None)
        cfg.pop("refresh_token", None)
        save_config(cfg)
        self.token = None
        self.refresh_token_val = None

    def get_contacts(self, search: str = "", page: int = 1, per_page: int = 50) -> list:
        params = {"page": page, "per_page": per_page}
        if search:
            params["search"] = search
        resp = self._request("GET", "/contacts", params=params)
        return resp.json().get("contacts", []) if resp.ok else []

    def create_contact(self, data: dict) -> Optional[dict]:
        resp = self._request("POST", "/contacts", json=data)
        return resp.json() if resp.ok else None

    def update_contact(self, contact_id: str, data: dict) -> Optional[dict]:
        resp = self._request("PATCH", f"/contacts/{contact_id}", json=data)
        return resp.json() if resp.ok else None

    def delete_contact(self, contact_id: str) -> bool:
        resp = self._request("DELETE", f"/contacts/{contact_id}")
        return resp.status_code == 204

    def toggle_favorite(self, contact_id: str) -> Optional[dict]:
        resp = self._request("POST", f"/contacts/{contact_id}/favorite")
        return resp.json() if resp.ok else None

    def ai_search(self, query: str) -> dict:
        resp = self._request("POST", "/ai/search", json={"query": query})
        return resp.json() if resp.ok else {"contacts": [], "explanation": "Search failed"}

    def get_analytics(self) -> Optional[dict]:
        resp = self._request("GET", "/analytics")
        return resp.json() if resp.ok else None
