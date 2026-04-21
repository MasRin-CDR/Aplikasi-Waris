from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.calculator import hitung_waris
from backend.models import HitungRequest, HitungResponse


app = FastAPI(
    title="API Kalkulator Waris Islam",
    description="Backend FastAPI untuk perhitungan waris Islam berbasis rule engine.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "API Kalkulator Waris aktif."}


@app.post("/hitung", response_model=HitungResponse)
def hitung(payload: HitungRequest) -> HitungResponse:
    try:
        return hitung_waris(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
