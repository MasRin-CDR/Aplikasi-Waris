from __future__ import annotations

from enum import Enum
from typing import Dict, List

from pydantic import BaseModel, ConfigDict, Field, model_validator


HEIR_FIELDS = (
    "suami",
    "istri",
    "ayah",
    "ibu",
    "kakek_ayah",
    "kakek_ibu",
    "nenek_ayah",
    "nenek_ibu",
    "anak_laki",
    "anak_perempuan",
    "cucu_laki",
    "cucu_perempuan",
    "cicit_laki",
    "cicit_perempuan",
    "saudara_laki_kandung",
    "saudara_perempuan_kandung",
    "saudara_laki_seayah",
    "saudara_perempuan_seayah",
    "saudara_laki_seibu",
    "saudara_perempuan_seibu",
    "keponakan_kandung",
    "keponakan_seayah",
    "paman_kandung",
    "paman_seayah",
)


class ModeWaris(str, Enum):
    faraid = "faraid"
    khi = "khi"


class AhliWarisOutput(BaseModel):
    nama: str
    jumlah_orang: int
    status: str
    bagian: str
    bagian_final: str
    saham: int
    saham_per_orang: int
    nominal: float
    nominal_per_orang: float
    catatan: List[str] = Field(default_factory=list)


class HitungRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", use_enum_values=True)

    anak_laki: int = Field(default=0, ge=0)
    anak_perempuan: int = Field(default=0, ge=0)
    suami: int = Field(default=0, ge=0, le=1)
    istri: int = Field(default=0, ge=0)
    ayah: int = Field(default=0, ge=0, le=1)
    ibu: int = Field(default=0, ge=0, le=1)
    kakek_ayah: int = Field(default=0, ge=0, le=1)
    kakek_ibu: int = Field(default=0, ge=0, le=1)
    nenek_ayah: int = Field(default=0, ge=0, le=1)
    nenek_ibu: int = Field(default=0, ge=0, le=1)
    cucu_laki: int = Field(default=0, ge=0)
    cucu_perempuan: int = Field(default=0, ge=0)
    cicit_laki: int = Field(default=0, ge=0)
    cicit_perempuan: int = Field(default=0, ge=0)
    saudara_laki_kandung: int = Field(default=0, ge=0)
    saudara_perempuan_kandung: int = Field(default=0, ge=0)
    saudara_laki_seayah: int = Field(default=0, ge=0)
    saudara_perempuan_seayah: int = Field(default=0, ge=0)
    saudara_laki_seibu: int = Field(default=0, ge=0)
    saudara_perempuan_seibu: int = Field(default=0, ge=0)
    keponakan_kandung: int = Field(default=0, ge=0)
    keponakan_seayah: int = Field(default=0, ge=0)
    paman_kandung: int = Field(default=0, ge=0)
    paman_seayah: int = Field(default=0, ge=0)
    harta: float = Field(..., ge=0)
    mode: ModeWaris = ModeWaris.faraid

    @model_validator(mode="after")
    def validate_request(self) -> "HitungRequest":
        if self.suami and self.istri:
            raise ValueError("Pilih salah satu saja: suami atau istri.")
        if sum(getattr(self, field_name) for field_name in HEIR_FIELDS) == 0:
            raise ValueError("Masukkan minimal satu ahli waris.")
        return self

    def heirs_dict(self) -> Dict[str, int]:
        return {field_name: int(getattr(self, field_name)) for field_name in HEIR_FIELDS}


class HitungResponse(BaseModel):
    mode: ModeWaris
    harta_total: float
    harta_bersama: float
    harta_waris: float
    asal_masalah: int
    jumlah_saham: int
    patokan_pembagian: int
    status: str
    kasus_khusus: List[str] = Field(default_factory=list)
    catatan: List[str] = Field(default_factory=list)
    ahli_waris: List[AhliWarisOutput] = Field(default_factory=list)
