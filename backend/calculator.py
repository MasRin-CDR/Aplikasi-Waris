from __future__ import annotations

from dataclasses import dataclass, field
from fractions import Fraction
from typing import Dict, Iterable, List

from backend.models import AhliWarisOutput, HitungRequest, HitungResponse, ModeWaris
from backend.utils import (
    ONE,
    ZERO,
    compute_tashih_base,
    distribute_share_by_weight,
    frac,
    fraction_to_text,
    lcm_many,
    money,
    sum_fractions,
)


HEIR_LABELS: Dict[str, str] = {
    "suami": "Suami",
    "istri": "Istri",
    "ayah": "Ayah",
    "ibu": "Ibu",
    "kakek_ayah": "Kakek dari Ayah",
    "kakek_ibu": "Kakek dari Ibu",
    "nenek_ayah": "Nenek dari Ayah",
    "nenek_ibu": "Nenek dari Ibu",
    "anak_laki": "Anak Laki-Laki",
    "anak_perempuan": "Anak Perempuan",
    "cucu_laki": "Cucu Laki-Laki",
    "cucu_perempuan": "Cucu Perempuan",
    "cicit_laki": "Cicit Laki-Laki",
    "cicit_perempuan": "Cicit Perempuan",
    "saudara_laki_kandung": "Saudara Laki-Laki Kandung",
    "saudara_perempuan_kandung": "Saudara Perempuan Kandung",
    "saudara_laki_seayah": "Saudara Laki-Laki Seayah",
    "saudara_perempuan_seayah": "Saudara Perempuan Seayah",
    "saudara_laki_seibu": "Saudara Laki-Laki Seibu",
    "saudara_perempuan_seibu": "Saudara Perempuan Seibu",
    "keponakan_kandung": "Keponakan Kandung",
    "keponakan_seayah": "Keponakan Seayah",
    "paman_kandung": "Paman Kandung",
    "paman_seayah": "Paman Seayah",
}

HEIR_ORDER = list(HEIR_LABELS.keys())


@dataclass
class HeirRecord:
    key: str
    nama: str
    jumlah: int
    bagian: Fraction = ZERO
    bagian_furudh: Fraction = ZERO
    blocked: bool = False
    status: str = "mahjub"
    basis: List[str] = field(default_factory=list)
    catatan: List[str] = field(default_factory=list)
    saham: int = 0
    saham_per_orang: int = 0
    nominal: float = 0.0
    nominal_per_orang: float = 0.0


class WarisCalculator:
    def __init__(self, request: HitungRequest) -> None:
        self.request = request
        self.input = request.heirs_dict()
        self.mode = request.mode.value if isinstance(request.mode, ModeWaris) else str(request.mode)
        self.records: Dict[str, HeirRecord] = {}
        self.catatan: List[str] = []
        self.kasus_khusus: List[str] = []
        self.flags: Dict[str, bool] = {}
        self.harta_total = float(request.harta)
        self.harta_bersama = 0.0
        self.harta_waris = self.harta_total
        self.asal_masalah = 1
        self.jumlah_saham = 0
        self.patokan_pembagian = 1
        self.status = "normal"
        self.fixed_total = ZERO
        self.has_ashabah_receiver = False
        self.special_case_direct = False

    def identifikasi_ahli_waris(self) -> None:
        for key in HEIR_ORDER:
            count = self.input.get(key, 0)
            if count > 0:
                self.records[key] = HeirRecord(key=key, nama=HEIR_LABELS[key], jumlah=count)

        if not self.records:
            raise ValueError("Masukkan minimal satu ahli waris.")

        if self.mode == ModeWaris.khi.value and (self.input["suami"] > 0 or self.input["istri"] > 0):
            self.harta_bersama = self.harta_total / 2
            self.harta_waris = self.harta_total - self.harta_bersama
            self.catatan.append(
                "[KHI] 1/2 harta dipisahkan terlebih dahulu sebagai harta bersama pasangan yang masih hidup."
            )

    def tentukan_mahjub(self) -> None:
        state = self._derive_state()

        self._block("kakek_ibu", "Kakek dari ibu termasuk dzawil arham sehingga tidak mendapat warisan.")

        if self.input["kakek_ayah"] > 0 and self.input["ayah"] > 0:
            self._block("kakek_ayah", "Kakek dari ayah terhalang oleh ayah.")

        if self.input["nenek_ayah"] > 0 and (self.input["ayah"] > 0 or self.input["ibu"] > 0):
            self._block("nenek_ayah", "Nenek dari ayah terhalang oleh ayah atau ibu.")

        if self.input["nenek_ibu"] > 0 and self.input["ibu"] > 0:
            self._block("nenek_ibu", "Nenek dari ibu terhalang oleh ibu.")

        if self.input["anak_laki"] > 0:
            self._block("cucu_laki", "Cucu laki-laki terhalang oleh anak laki-laki.")
            self._block("cucu_perempuan", "Cucu perempuan terhalang oleh anak laki-laki.")
            self._block("cicit_laki", "Cicit laki-laki terhalang oleh anak laki-laki.")
            self._block("cicit_perempuan", "Cicit perempuan terhalang oleh anak laki-laki.")
        elif self.input["cucu_laki"] > 0 or self.input["cucu_perempuan"] > 0:
            self._block("cicit_laki", "Cicit laki-laki terhalang karena sudah ada cucu.")
            self._block("cicit_perempuan", "Cicit perempuan terhalang karena sudah ada cucu.")

        if state["maternal_sibling_total"] > 0 and (
            state["has_descendant"] or self.input["ayah"] > 0 or state["active_paternal_grandfather"]
        ):
            self._block(
                "saudara_laki_seibu",
                "Saudara seibu terhalang oleh anak keturunan, ayah, atau kakek dari ayah.",
            )
            self._block(
                "saudara_perempuan_seibu",
                "Saudara seibu terhalang oleh anak keturunan, ayah, atau kakek dari ayah.",
            )

        if self.mode == ModeWaris.khi.value and state["has_descendant"]:
            for key in (
                "saudara_laki_kandung",
                "saudara_perempuan_kandung",
                "saudara_laki_seayah",
                "saudara_perempuan_seayah",
            ):
                self._block(key, "Dalam mode KHI, semua saudara terhalang jika ada anak atau ahli waris pengganti.")

    def tentukan_bagian_furudh(self) -> None:
        if self._apply_special_cases():
            self.special_case_direct = True
            return

        state = self._derive_state()
        grandfather_sibling_case = (
            state["active_paternal_grandfather"]
            and not state["has_descendant"]
            and (state["full_sibling_total"] + state["paternal_sibling_total"] > 0)
        )

        self.flags = {
            "father_residuary": False,
            "grandfather_residuary": False,
            "full_sibling_residuary": False,
            "full_sisters_am": False,
            "paternal_sibling_residuary": False,
            "paternal_sisters_am": False,
            "khi_combined_sibling_residuary": False,
        }

        if grandfather_sibling_case:
            self.kasus_khusus.append("Muqasamah")
            self.catatan.append(
                "Kakek dari ayah akan dipilihkan opsi paling menguntungkan antara muqasamah, 1/3 sisa, atau 1/6."
            )

        if self.input["suami"] > 0:
            share = frac(1, 4) if state["has_descendant"] else frac(1, 2)
            basis = "1/4" if state["has_descendant"] else "1/2"
            note = (
                "Suami mendapat 1/4 karena ada anak keturunan."
                if state["has_descendant"]
                else "Suami mendapat 1/2 karena tidak ada anak keturunan."
            )
            self._award_fixed("suami", share, basis, note)

        if self.input["istri"] > 0:
            share = frac(1, 8) if state["has_descendant"] else frac(1, 4)
            basis = "1/8" if state["has_descendant"] else "1/4"
            note = (
                "Istri bersama-sama mendapat 1/8 karena ada anak keturunan."
                if state["has_descendant"]
                else "Istri bersama-sama mendapat 1/4 karena tidak ada anak keturunan."
            )
            self._award_fixed("istri", share, basis, note)

        if self.input["ibu"] > 0:
            mother_share = frac(1, 6) if state["has_descendant"] or state["sibling_total"] > 1 else frac(1, 3)
            self._award_fixed(
                "ibu",
                mother_share,
                "1/6" if mother_share == frac(1, 6) else "1/3",
                (
                    "Ibu mendapat 1/6 karena ada anak keturunan atau saudara lebih dari satu."
                    if mother_share == frac(1, 6)
                    else "Ibu mendapat 1/3 karena tidak ada anak keturunan dan saudara tidak lebih dari satu."
                ),
            )

        if self.input["ayah"] > 0:
            if state["has_male_descendant"]:
                self._award_fixed("ayah", frac(1, 6), "1/6", "Ayah mendapat 1/6 karena ada anak keturunan laki-laki.")
            elif state["has_female_descendant"]:
                self._award_fixed(
                    "ayah",
                    frac(1, 6),
                    "1/6 + sisa",
                    "Ayah mendapat 1/6 dan berhak atas sisa karena hanya ada keturunan perempuan.",
                )
                self.flags["father_residuary"] = True
            else:
                self.flags["father_residuary"] = True

        if self.input["kakek_ayah"] > 0 and not self._is_blocked("kakek_ayah") and not grandfather_sibling_case:
            if state["has_male_descendant"]:
                self._award_fixed(
                    "kakek_ayah",
                    frac(1, 6),
                    "1/6",
                    "Kakek dari ayah mendapat 1/6 karena ada anak keturunan laki-laki.",
                )
            elif state["has_female_descendant"]:
                self._award_fixed(
                    "kakek_ayah",
                    frac(1, 6),
                    "1/6 + sisa",
                    "Kakek dari ayah mendapat 1/6 dan berhak atas sisa karena hanya ada keturunan perempuan.",
                )
                self.flags["grandfather_residuary"] = True
            else:
                self.flags["grandfather_residuary"] = True

        paternal_grandmother_eligible = (
            self.input["nenek_ayah"] > 0 and self.input["ayah"] == 0 and self.input["ibu"] == 0
        )
        maternal_grandmother_eligible = self.input["nenek_ibu"] > 0 and self.input["ibu"] == 0

        if paternal_grandmother_eligible and maternal_grandmother_eligible:
            self._award_fixed("nenek_ayah", frac(1, 12), "1/12", "Nenek dari ayah berbagi 1/6 bersama nenek dari ibu.")
            self._award_fixed("nenek_ibu", frac(1, 12), "1/12", "Nenek dari ibu berbagi 1/6 bersama nenek dari ayah.")
        elif paternal_grandmother_eligible:
            self._award_fixed("nenek_ayah", frac(1, 6), "1/6", "Nenek dari ayah mendapat 1/6.")
        elif maternal_grandmother_eligible:
            self._award_fixed("nenek_ibu", frac(1, 6), "1/6", "Nenek dari ibu mendapat 1/6.")

        if self.input["anak_perempuan"] > 0 and self.input["anak_laki"] == 0:
            share = frac(1, 2) if self.input["anak_perempuan"] == 1 else frac(2, 3)
            self._award_fixed(
                "anak_perempuan",
                share,
                "1/2" if share == frac(1, 2) else "2/3",
                (
                    "Seorang anak perempuan mendapat 1/2 karena tidak ada anak laki-laki."
                    if share == frac(1, 2)
                    else "Dua atau lebih anak perempuan mendapat 2/3 karena tidak ada anak laki-laki."
                ),
            )

        if self.input["cucu_perempuan"] > 0 and self.input["anak_laki"] == 0 and self.input["cucu_laki"] == 0:
            if self.input["anak_perempuan"] > 0:
                self._award_fixed(
                    "cucu_perempuan",
                    frac(1, 6),
                    "1/6",
                    "Cucu perempuan mendapat 1/6 karena ada anak perempuan dan tidak ada cucu laki-laki.",
                )
            else:
                share = frac(1, 2) if self.input["cucu_perempuan"] == 1 else frac(2, 3)
                self._award_fixed(
                    "cucu_perempuan",
                    share,
                    "1/2" if share == frac(1, 2) else "2/3",
                    (
                        "Seorang cucu perempuan mendapat 1/2."
                        if share == frac(1, 2)
                        else "Dua atau lebih cucu perempuan mendapat 2/3."
                    ),
                )

        if (
            self.input["cicit_perempuan"] > 0
            and self.input["anak_laki"] == 0
            and self.input["cucu_laki"] == 0
            and self.input["cucu_perempuan"] == 0
            and self.input["cicit_laki"] == 0
        ):
            if self.input["anak_perempuan"] > 0:
                self._award_fixed(
                    "cicit_perempuan",
                    frac(1, 6),
                    "1/6",
                    "Cicit perempuan mendapat 1/6 karena ada keturunan perempuan di atasnya.",
                )
            else:
                share = frac(1, 2) if self.input["cicit_perempuan"] == 1 else frac(2, 3)
                self._award_fixed(
                    "cicit_perempuan",
                    share,
                    "1/2" if share == frac(1, 2) else "2/3",
                    (
                        "Seorang cicit perempuan mendapat 1/2."
                        if share == frac(1, 2)
                        else "Dua atau lebih cicit perempuan mendapat 2/3."
                    ),
                )

        maternal_siblings = self.input["saudara_laki_seibu"] + self.input["saudara_perempuan_seibu"]
        if maternal_siblings > 0 and not (
            self._is_blocked("saudara_laki_seibu") and self._is_blocked("saudara_perempuan_seibu")
        ):
            shared = frac(1, 6) if maternal_siblings == 1 else frac(1, 3)
            distributed = distribute_share_by_weight(
                shared,
                [
                    ("saudara_laki_seibu", self.input["saudara_laki_seibu"], 1),
                    ("saudara_perempuan_seibu", self.input["saudara_perempuan_seibu"], 1),
                ],
            )
            for key, share in distributed.items():
                self._award_fixed(key, share, "1/6" if maternal_siblings == 1 else "1/3", "Saudara seibu berbagi rata.")

        if self.mode == ModeWaris.khi.value:
            self._apply_khi_sibling_rules(state, grandfather_sibling_case)
        else:
            self._apply_faraid_sibling_rules(state, grandfather_sibling_case)

    def tentukan_ashabah(self) -> None:
        if self.special_case_direct:
            return

        self.fixed_total = sum_fractions(record.bagian_furudh for record in self.records.values())
        if self.fixed_total >= ONE:
            return

        residue = ONE - self.fixed_total
        applied = False
        state = self._derive_state()
        grandfather_sibling_case = (
            state["active_paternal_grandfather"]
            and not state["has_descendant"]
            and (state["full_sibling_total"] + state["paternal_sibling_total"] > 0)
        )

        if self.input["anak_laki"] > 0:
            self.kasus_khusus.append("Muassib")
            self._distribute_final(
                residue,
                [
                    ("anak_laki", self.input["anak_laki"], 2),
                    ("anak_perempuan", self.input["anak_perempuan"], 1),
                ],
                "Ashabah",
                "Anak laki-laki dan perempuan berbagi sisa dengan rasio 2:1.",
            )
            applied = True
        elif self.input["cucu_laki"] > 0 and self.input["anak_laki"] == 0:
            if self.input["cucu_perempuan"] > 0:
                self.kasus_khusus.append("Muassib")
            self._distribute_final(
                residue,
                [
                    ("cucu_laki", self.input["cucu_laki"], 2),
                    ("cucu_perempuan", self.input["cucu_perempuan"], 1),
                ],
                "Ashabah",
                "Cucu laki-laki dan perempuan berbagi sisa dengan rasio 2:1.",
            )
            applied = True
        elif (
            self.input["cicit_laki"] > 0
            and self.input["anak_laki"] == 0
            and self.input["cucu_laki"] == 0
            and self.input["cucu_perempuan"] == 0
        ):
            if self.input["cicit_perempuan"] > 0:
                self.kasus_khusus.append("Muassib")
            self._distribute_final(
                residue,
                [
                    ("cicit_laki", self.input["cicit_laki"], 2),
                    ("cicit_perempuan", self.input["cicit_perempuan"], 1),
                ],
                "Ashabah",
                "Cicit laki-laki dan perempuan berbagi sisa dengan rasio 2:1.",
            )
            applied = True
        elif self.flags.get("father_residuary"):
            self._award_residual("ayah", residue, "Sisa", "Ayah mengambil sisa harta.")
            applied = True
        elif grandfather_sibling_case:
            self._apply_muqasamah(residue)
            applied = True
        elif self.flags.get("grandfather_residuary"):
            self._award_residual("kakek_ayah", residue, "Sisa", "Kakek dari ayah mengambil sisa harta.")
            applied = True
        elif self.flags.get("khi_combined_sibling_residuary"):
            self._distribute_final(
                residue,
                [
                    ("saudara_laki_kandung", self.input["saudara_laki_kandung"], 2),
                    ("saudara_laki_seayah", self.input["saudara_laki_seayah"], 2),
                    ("saudara_perempuan_kandung", self.input["saudara_perempuan_kandung"], 1),
                    ("saudara_perempuan_seayah", self.input["saudara_perempuan_seayah"], 1),
                ],
                "Ashabah",
                "Dalam mode KHI, saudara kandung dan seayah setara lalu berbagi sisa dengan rasio 2:1.",
            )
            applied = True
        elif self.flags.get("full_sibling_residuary"):
            self._distribute_final(
                residue,
                [
                    ("saudara_laki_kandung", self.input["saudara_laki_kandung"], 2),
                    ("saudara_perempuan_kandung", self.input["saudara_perempuan_kandung"], 1),
                ],
                "Ashabah",
                "Saudara kandung berbagi sisa dengan rasio 2:1.",
            )
            applied = True
        elif self.flags.get("full_sisters_am"):
            self._distribute_final(
                residue,
                [("saudara_perempuan_kandung", self.input["saudara_perempuan_kandung"], 1)],
                "AM",
                "Saudari kandung menjadi ashabah ma'al ghair bersama keturunan perempuan.",
            )
            applied = True
        elif self.flags.get("paternal_sibling_residuary"):
            self._distribute_final(
                residue,
                [
                    ("saudara_laki_seayah", self.input["saudara_laki_seayah"], 2),
                    ("saudara_perempuan_seayah", self.input["saudara_perempuan_seayah"], 1),
                ],
                "Ashabah",
                "Saudara seayah berbagi sisa dengan rasio 2:1.",
            )
            applied = True
        elif self.flags.get("paternal_sisters_am"):
            self._distribute_final(
                residue,
                [("saudara_perempuan_seayah", self.input["saudara_perempuan_seayah"], 1)],
                "AM",
                "Saudari seayah menjadi ashabah ma'al ghair bersama keturunan perempuan.",
            )
            applied = True
        elif self._can_take_full_nephew():
            self._distribute_final(
                residue,
                [("keponakan_kandung", self.input["keponakan_kandung"], 1)],
                "Ashabah",
                "Keponakan kandung mengambil sisa karena tidak ada ahli waris laki-laki yang lebih dekat.",
            )
            applied = True
        elif self._can_take_paternal_nephew():
            self._distribute_final(
                residue,
                [("keponakan_seayah", self.input["keponakan_seayah"], 1)],
                "Ashabah",
                "Keponakan seayah mengambil sisa karena tidak ada ahli waris laki-laki yang lebih dekat.",
            )
            applied = True
        elif self._can_take_full_uncle():
            self._distribute_final(
                residue,
                [("paman_kandung", self.input["paman_kandung"], 1)],
                "Ashabah",
                "Paman kandung mengambil sisa karena tidak ada ahli waris laki-laki yang lebih dekat.",
            )
            applied = True
        elif self._can_take_paternal_uncle():
            self._distribute_final(
                residue,
                [("paman_seayah", self.input["paman_seayah"], 1)],
                "Ashabah",
                "Paman seayah mengambil sisa karena tidak ada ahli waris laki-laki yang lebih dekat.",
            )
            applied = True

        self.has_ashabah_receiver = applied

    def hitung_asal_masalah(self) -> None:
        positive_shares = [record.bagian for record in self.records.values() if record.bagian > 0]
        if not positive_shares:
            raise ValueError("Semua ahli waris yang diinput mahjub sehingga tidak ada bagian yang dapat dibagikan.")

        denominators = [share.denominator for share in positive_shares]
        self.asal_masalah = lcm_many(denominators) or 1

    def hitung_saham(self) -> None:
        total_saham = 0
        for record in self.records.values():
            if record.bagian > 0:
                record.saham = int(self.asal_masalah * record.bagian)
                total_saham += record.saham
            else:
                record.saham = 0
        self.jumlah_saham = total_saham

    def deteksi_aul_radd(self) -> None:
        if self.special_case_direct:
            self.status = "normal"
            self._finalize_after_adjustment()
            return

        total_share = sum_fractions(record.bagian for record in self.records.values())

        if self.jumlah_saham > self.asal_masalah:
            self.status = "aul"
            factor = Fraction(self.asal_masalah, self.jumlah_saham)
            for record in self.records.values():
                if record.bagian > 0:
                    record.bagian *= factor
                    record.catatan.append("Bagian disesuaikan karena terjadi aul.")
            self.catatan.append("Jumlah saham melebihi asal masalah sehingga diterapkan aul.")
        elif self.jumlah_saham < self.asal_masalah and not self.has_ashabah_receiver:
            residue = ONE - total_share
            radd_targets = self._get_radd_targets()
            if residue > 0 and radd_targets:
                self.status = "radd"
                fixed_total = sum_fractions(record.bagian_furudh for record in radd_targets)
                for record in radd_targets:
                    extra = residue * Fraction(record.bagian_furudh, fixed_total)
                    record.bagian += extra
                    record.catatan.append(
                        "Sisa harta dikembalikan melalui radd secara proporsional kepada penerima furudh."
                    )
                self.catatan.append("Jumlah saham lebih kecil dari asal masalah dan tidak ada ashabah, sehingga diterapkan radd.")
            else:
                self.status = "normal"
        else:
            self.status = "normal"

        self._finalize_after_adjustment()

    def hitung_nominal(self) -> None:
        denominator = max(self.patokan_pembagian, 1)
        for record in self.records.values():
            if record.saham > 0:
                ratio = Fraction(record.saham, denominator)
                record.nominal = money(self.harta_waris * float(ratio))
                record.nominal_per_orang = money(record.nominal / record.jumlah)
                record.saham_per_orang = record.saham // record.jumlah if record.jumlah else 0
            else:
                record.nominal = 0.0
                record.nominal_per_orang = 0.0
                record.saham_per_orang = 0

    def build_response(self) -> HitungResponse:
        ahli_waris: List[AhliWarisOutput] = []
        for key in HEIR_ORDER:
            record = self.records.get(key)
            if not record:
                continue

            if record.bagian > 0 and not record.basis:
                record.basis.append(fraction_to_text(record.bagian))
            if record.bagian == 0 and not record.catatan:
                record.catatan.append("Tidak mendapat bagian pada komposisi ini.")

            ahli_waris.append(
                AhliWarisOutput(
                    nama=record.nama,
                    jumlah_orang=record.jumlah,
                    status=record.status,
                    bagian=" + ".join(record.basis) if record.basis else "0",
                    bagian_final=fraction_to_text(record.bagian),
                    saham=record.saham,
                    saham_per_orang=record.saham_per_orang,
                    nominal=record.nominal,
                    nominal_per_orang=record.nominal_per_orang,
                    catatan=record.catatan,
                )
            )

        return HitungResponse(
            mode=ModeWaris(self.mode),
            harta_total=money(self.harta_total),
            harta_bersama=money(self.harta_bersama),
            harta_waris=money(self.harta_waris),
            asal_masalah=self.asal_masalah,
            jumlah_saham=self.jumlah_saham,
            patokan_pembagian=self.patokan_pembagian,
            status=self.status,
            kasus_khusus=list(dict.fromkeys(self.kasus_khusus)),
            catatan=self.catatan,
            ahli_waris=ahli_waris,
        )

    def _apply_special_cases(self) -> bool:
        if self._is_gharrawain():
            self.kasus_khusus.append("Gharrawain")
            self.catatan.append(
                "Dalam gharrawain, suami atau istri mengambil bagiannya terlebih dahulu, lalu ibu mendapat 1/3 dari sisa."
            )
            if self.input["suami"] > 0:
                self._award_fixed("suami", frac(1, 2), "1/2", "Suami mendapat 1/2 karena tidak ada keturunan.")
                self._award_fixed("ibu", frac(1, 6), "1/3 sisa", "Ibu mendapat 1/3 dari sisa setelah bagian suami.")
                self._award_residual("ayah", frac(1, 3), "Sisa", "Ayah menerima sisa setelah gharrawain diterapkan.")
            else:
                self._award_fixed("istri", frac(1, 4), "1/4", "Istri mendapat 1/4 karena tidak ada keturunan.")
                self._award_fixed("ibu", frac(1, 4), "1/3 sisa", "Ibu mendapat 1/3 dari sisa setelah bagian istri.")
                self._award_residual("ayah", frac(1, 2), "Sisa", "Ayah menerima sisa setelah gharrawain diterapkan.")
            return True

        if self._is_musytarakah():
            self.kasus_khusus.append("Musytarakah")
            self.catatan.append(
                "Pada musytarakah, saudara kandung ikut bersekutu dengan saudara seibu dalam bagian 1/3 dan dibagi rata per orang."
            )
            self._award_fixed("suami", frac(1, 2), "1/2", "Suami mendapat 1/2.")

            grandmother_items = [
                ("nenek_ayah", self.input["nenek_ayah"], 1),
                ("nenek_ibu", self.input["nenek_ibu"], 1),
            ]
            if self.input["ibu"] > 0:
                self._award_fixed("ibu", frac(1, 6), "1/6", "Ibu mendapat 1/6 pada musytarakah.")
            else:
                for key, share in distribute_share_by_weight(frac(1, 6), grandmother_items).items():
                    self._award_fixed(key, share, "1/6", "Nenek menggantikan posisi ibu pada musytarakah.")

            for key, share in distribute_share_by_weight(
                frac(1, 3),
                [
                    ("saudara_laki_seibu", self.input["saudara_laki_seibu"], 1),
                    ("saudara_perempuan_seibu", self.input["saudara_perempuan_seibu"], 1),
                    ("saudara_laki_kandung", self.input["saudara_laki_kandung"], 1),
                    ("saudara_perempuan_kandung", self.input["saudara_perempuan_kandung"], 1),
                ],
            ).items():
                self._award_fixed(
                    key,
                    share,
                    "1/3 bersama",
                    "Saudara seibu dan saudara kandung berbagi bersama dalam bagian musytarakah.",
                )
            return True

        if self._is_akdariyah():
            self.kasus_khusus.append("Akdariyah")
            self.catatan.append(
                "Akdariyah diselesaikan dengan menggabungkan saham saudari dan kakek lalu ditashih menjadi 27 saham."
            )
            self._award_fixed("suami", frac(9, 27), "Akdariyah", "Suami memperoleh 9 dari 27 saham.")
            self._award_fixed("ibu", frac(6, 27), "Akdariyah", "Ibu memperoleh 6 dari 27 saham setelah penyelesaian akdariyah.")
            self._award_residual("kakek_ayah", frac(8, 27), "Akdariyah", "Kakek memperoleh 8 dari 27 saham.")
            if self.input["saudara_perempuan_kandung"] > 0:
                self._award_residual(
                    "saudara_perempuan_kandung",
                    frac(4, 27),
                    "Akdariyah",
                    "Saudari kandung memperoleh 4 dari 27 saham.",
                )
            else:
                self._award_residual(
                    "saudara_perempuan_seayah",
                    frac(4, 27),
                    "Akdariyah",
                    "Saudari seayah memperoleh 4 dari 27 saham.",
                )
            return True

        return False

    def _apply_faraid_sibling_rules(self, state: Dict[str, int | bool], grandfather_sibling_case: bool) -> None:
        if grandfather_sibling_case:
            if state["full_sibling_total"] > 0:
                self._block("saudara_laki_seayah", "Saudara seayah terhalang oleh saudara kandung yang lebih dekat.")
                self._block("saudara_perempuan_seayah", "Saudari seayah terhalang oleh saudara kandung yang lebih dekat.")
            return

        if state["active_paternal_grandfather"]:
            self._block("saudara_laki_kandung", "Saudara kandung disisihkan karena kakek dari ayah lebih diutamakan pada model ini.")
            self._block("saudara_perempuan_kandung", "Saudari kandung disisihkan karena kakek dari ayah lebih diutamakan pada model ini.")
            self._block("saudara_laki_seayah", "Saudara seayah disisihkan karena kakek dari ayah lebih diutamakan pada model ini.")
            self._block("saudara_perempuan_seayah", "Saudari seayah disisihkan karena kakek dari ayah lebih diutamakan pada model ini.")
            return

        if state["full_sibling_total"] > 0:
            if self.input["ayah"] > 0 or state["has_male_descendant"]:
                self._block("saudara_laki_kandung", "Saudara kandung terhalang oleh ayah atau anak keturunan laki-laki.")
                self._block("saudara_perempuan_kandung", "Saudari kandung terhalang oleh ayah atau anak keturunan laki-laki.")
            elif self.input["saudara_laki_kandung"] > 0:
                self.flags["full_sibling_residuary"] = True
            elif state["has_female_descendant"]:
                self.flags["full_sisters_am"] = True
            else:
                share = frac(1, 2) if self.input["saudara_perempuan_kandung"] == 1 else frac(2, 3)
                self._award_fixed(
                    "saudara_perempuan_kandung",
                    share,
                    "1/2" if share == frac(1, 2) else "2/3",
                    (
                        "Seorang saudari kandung mendapat 1/2."
                        if share == frac(1, 2)
                        else "Dua atau lebih saudari kandung mendapat 2/3."
                    ),
                )

        if state["paternal_sibling_total"] > 0:
            if self.input["ayah"] > 0 or state["has_male_descendant"]:
                self._block("saudara_laki_seayah", "Saudara seayah terhalang oleh ayah atau anak keturunan laki-laki.")
                self._block("saudara_perempuan_seayah", "Saudari seayah terhalang oleh ayah atau anak keturunan laki-laki.")
            elif self.input["saudara_laki_seayah"] > 0:
                if state["full_sibling_total"] > 0:
                    self._block("saudara_laki_seayah", "Saudara seayah terhalang oleh saudara kandung.")
                    self._block("saudara_perempuan_seayah", "Saudari seayah terhalang oleh saudara kandung.")
                else:
                    self.flags["paternal_sibling_residuary"] = True
            elif self.input["saudara_laki_kandung"] > 0 or self.input["saudara_perempuan_kandung"] >= 2:
                self._block("saudara_perempuan_seayah", "Saudari seayah terhalang oleh saudara kandung yang lebih kuat.")
            elif state["has_female_descendant"] and state["full_sibling_total"] == 0:
                self.flags["paternal_sisters_am"] = True
            elif self.input["saudara_perempuan_kandung"] == 1 and not state["has_descendant"]:
                self._award_fixed(
                    "saudara_perempuan_seayah",
                    frac(1, 6),
                    "1/6",
                    "Saudari seayah mendapat 1/6 sebagai penyempurna bersama satu saudari kandung.",
                )
            elif state["full_sibling_total"] == 0:
                share = frac(1, 2) if self.input["saudara_perempuan_seayah"] == 1 else frac(2, 3)
                self._award_fixed(
                    "saudara_perempuan_seayah",
                    share,
                    "1/2" if share == frac(1, 2) else "2/3",
                    (
                        "Seorang saudari seayah mendapat 1/2."
                        if share == frac(1, 2)
                        else "Dua atau lebih saudari seayah mendapat 2/3."
                    ),
                )
            else:
                self._block("saudara_perempuan_seayah", "Saudari seayah terhalang oleh ahli waris yang lebih dekat.")

    def _apply_khi_sibling_rules(self, state: Dict[str, int | bool], grandfather_sibling_case: bool) -> None:
        if grandfather_sibling_case:
            self.flags["khi_combined_sibling_residuary"] = False
            return

        if state["active_paternal_grandfather"] and not state["has_descendant"]:
            return

        if state["has_descendant"] or self.input["ayah"] > 0:
            for key in (
                "saudara_laki_kandung",
                "saudara_perempuan_kandung",
                "saudara_laki_seayah",
                "saudara_perempuan_seayah",
            ):
                self._block(key, "Dalam mode KHI, saudara kandung dan seayah mahjub jika ada ayah atau anak.")
            return

        total_male = self.input["saudara_laki_kandung"] + self.input["saudara_laki_seayah"]
        total_female = self.input["saudara_perempuan_kandung"] + self.input["saudara_perempuan_seayah"]

        if total_male > 0:
            self.flags["khi_combined_sibling_residuary"] = True
            self.kasus_khusus.append("Muassib")
            return

        if total_female == 1:
            if self.input["saudara_perempuan_kandung"] == 1:
                self._award_fixed(
                    "saudara_perempuan_kandung",
                    frac(1, 2),
                    "1/2",
                    "Dalam mode KHI, satu saudari kandung mendapat 1/2 jika tidak mahjub.",
                )
            elif self.input["saudara_perempuan_seayah"] == 1:
                self._award_fixed(
                    "saudara_perempuan_seayah",
                    frac(1, 2),
                    "1/2",
                    "Dalam mode KHI, satu saudari seayah diperlakukan setara dengan saudari kandung dan mendapat 1/2 jika tidak mahjub.",
                )
            return

        if total_female > 1:
            distributed = distribute_share_by_weight(
                frac(2, 3),
                [
                    ("saudara_perempuan_kandung", self.input["saudara_perempuan_kandung"], 1),
                    ("saudara_perempuan_seayah", self.input["saudara_perempuan_seayah"], 1),
                ],
            )
            for key, share in distributed.items():
                self._award_fixed(
                    key,
                    share,
                    "2/3",
                    "Dalam mode KHI, saudari kandung dan seayah setara dan bersama-sama mendapat 2/3.",
                )

    def _apply_muqasamah(self, residue: Fraction) -> None:
        has_full = self.input["saudara_laki_kandung"] + self.input["saudara_perempuan_kandung"] > 0
        sibling_items = (
            [
                ("saudara_laki_kandung", self.input["saudara_laki_kandung"], 2),
                ("saudara_perempuan_kandung", self.input["saudara_perempuan_kandung"], 1),
            ]
            if has_full
            else [
                ("saudara_laki_seayah", self.input["saudara_laki_seayah"], 2),
                ("saudara_perempuan_seayah", self.input["saudara_perempuan_seayah"], 1),
            ]
        )

        total_weight = sum(count * weight for _, count, weight in sibling_items if count > 0)
        option_sixth = frac(1, 6)
        option_third_residue = residue / 3
        option_muqasamah = residue * Fraction(2, total_weight + 2) if total_weight else residue

        chosen = option_sixth
        label = "1/6"
        if option_third_residue > chosen:
            chosen = option_third_residue
            label = "1/3 sisa"
        if option_muqasamah > chosen:
            chosen = option_muqasamah
            label = "Muqasamah"

        self._award_residual("kakek_ayah", chosen, label, "Kakek dari ayah mengambil bagian terbaik menurut muqasamah.")
        self._distribute_final(
            residue - chosen,
            sibling_items,
            "Sisa muqasamah",
            "Saudara menerima sisa setelah bagian kakek dipilih menurut muqasamah.",
        )

    def _finalize_after_adjustment(self) -> None:
        shares = {key: record.bagian for key, record in self.records.items() if record.bagian > 0}
        counts = {key: record.jumlah for key, record in self.records.items()}
        self.patokan_pembagian = compute_tashih_base(shares, counts) if shares else 1

        for record in self.records.values():
            if record.bagian > 0:
                record.saham = int(self.patokan_pembagian * record.bagian)
            else:
                record.saham = 0

    def _derive_state(self) -> Dict[str, int | bool]:
        has_male_descendant = self.input["anak_laki"] > 0 or self.input["cucu_laki"] > 0 or self.input["cicit_laki"] > 0
        has_female_descendant = (
            self.input["anak_perempuan"] > 0 or self.input["cucu_perempuan"] > 0 or self.input["cicit_perempuan"] > 0
        )
        return {
            "has_male_descendant": has_male_descendant,
            "has_female_descendant": has_female_descendant,
            "has_descendant": has_male_descendant or has_female_descendant,
            "sibling_total": (
                self.input["saudara_laki_kandung"]
                + self.input["saudara_perempuan_kandung"]
                + self.input["saudara_laki_seayah"]
                + self.input["saudara_perempuan_seayah"]
                + self.input["saudara_laki_seibu"]
                + self.input["saudara_perempuan_seibu"]
            ),
            "maternal_sibling_total": self.input["saudara_laki_seibu"] + self.input["saudara_perempuan_seibu"],
            "full_sibling_total": self.input["saudara_laki_kandung"] + self.input["saudara_perempuan_kandung"],
            "paternal_sibling_total": self.input["saudara_laki_seayah"] + self.input["saudara_perempuan_seayah"],
            "active_paternal_grandfather": self.input["kakek_ayah"] > 0 and self.input["ayah"] == 0,
        }

    def _block(self, key: str, note: str) -> None:
        record = self.records.get(key)
        if not record:
            return
        record.blocked = True
        record.status = "mahjub"
        if note not in record.catatan:
            record.catatan.append(note)

    def _is_blocked(self, key: str) -> bool:
        return self.records.get(key).blocked if key in self.records else False

    def _award_fixed(self, key: str, share: Fraction, basis: str, note: str) -> None:
        record = self.records.get(key)
        if not record or record.blocked or share <= 0:
            return
        record.bagian += share
        record.bagian_furudh += share
        record.status = "furudh"
        self._append_basis(record, basis)
        self._append_note(record, note)

    def _award_residual(self, key: str, share: Fraction, basis: str, note: str) -> None:
        record = self.records.get(key)
        if not record or record.blocked or share <= 0:
            return
        record.bagian += share
        record.status = "ashabah"
        self._append_basis(record, basis)
        self._append_note(record, note)

    def _distribute_final(
        self,
        total_share: Fraction,
        items: Iterable[tuple[str, int, int]],
        basis: str,
        note: str,
    ) -> None:
        distributed = distribute_share_by_weight(total_share, items)
        for key, share in distributed.items():
            self._award_residual(key, share, basis, note)

    def _append_basis(self, record: HeirRecord, value: str) -> None:
        if value and value not in record.basis:
            record.basis.append(value)

    def _append_note(self, record: HeirRecord, value: str) -> None:
        if value and value not in record.catatan:
            record.catatan.append(value)

    def _get_radd_targets(self) -> List[HeirRecord]:
        fixed_receivers = [record for record in self.records.values() if record.bagian_furudh > 0]
        without_spouses = [record for record in fixed_receivers if record.key not in {"suami", "istri"}]
        return without_spouses or fixed_receivers

    def _is_gharrawain(self) -> bool:
        allowed = {"suami", "istri", "ibu", "ayah"}
        return (
            self.input["ibu"] > 0
            and self.input["ayah"] > 0
            and (self.input["suami"] > 0 or self.input["istri"] > 0)
            and all(key in allowed or self.input[key] == 0 for key in HEIR_ORDER)
        )

    def _is_musytarakah(self) -> bool:
        state = self._derive_state()
        grandmother_present = self.input["nenek_ayah"] > 0 or self.input["nenek_ibu"] > 0
        allowed = {
            "suami",
            "ibu",
            "nenek_ayah",
            "nenek_ibu",
            "saudara_laki_seibu",
            "saudara_perempuan_seibu",
            "saudara_laki_kandung",
            "saudara_perempuan_kandung",
        }
        return (
            self.input["suami"] == 1
            and not state["has_descendant"]
            and self.input["ayah"] == 0
            and self.input["kakek_ayah"] == 0
            and (self.input["saudara_laki_seibu"] + self.input["saudara_perempuan_seibu"] >= 2)
            and (self.input["saudara_laki_kandung"] + self.input["saudara_perempuan_kandung"] > 0)
            and (self.input["ibu"] == 1 or grandmother_present)
            and all(key in allowed or self.input[key] == 0 for key in HEIR_ORDER)
        )

    def _is_akdariyah(self) -> bool:
        state = self._derive_state()
        sister_count = self.input["saudara_perempuan_kandung"] + self.input["saudara_perempuan_seayah"]
        allowed = {"suami", "ibu", "kakek_ayah", "saudara_perempuan_kandung", "saudara_perempuan_seayah"}
        return (
            self.input["suami"] == 1
            and self.input["ibu"] == 1
            and self.input["kakek_ayah"] == 1
            and self.input["ayah"] == 0
            and not state["has_descendant"]
            and sister_count == 1
            and self.input["saudara_laki_kandung"] == 0
            and self.input["saudara_laki_seayah"] == 0
            and all(key in allowed or self.input[key] == 0 for key in HEIR_ORDER)
        )

    def _can_take_full_nephew(self) -> bool:
        return (
            self.input["keponakan_kandung"] > 0
            and self.input["anak_laki"] == 0
            and self.input["cucu_laki"] == 0
            and self.input["cicit_laki"] == 0
            and self.input["ayah"] == 0
            and self.input["kakek_ayah"] == 0
            and self.input["saudara_laki_kandung"] == 0
            and self.input["saudara_laki_seayah"] == 0
        )

    def _can_take_paternal_nephew(self) -> bool:
        return (
            self.input["keponakan_seayah"] > 0
            and self.input["keponakan_kandung"] == 0
            and self.input["anak_laki"] == 0
            and self.input["cucu_laki"] == 0
            and self.input["cicit_laki"] == 0
            and self.input["ayah"] == 0
            and self.input["kakek_ayah"] == 0
            and self.input["saudara_laki_kandung"] == 0
            and self.input["saudara_laki_seayah"] == 0
        )

    def _can_take_full_uncle(self) -> bool:
        return (
            self.input["paman_kandung"] > 0
            and self.input["anak_laki"] == 0
            and self.input["cucu_laki"] == 0
            and self.input["cicit_laki"] == 0
            and self.input["ayah"] == 0
            and self.input["kakek_ayah"] == 0
            and self.input["saudara_laki_kandung"] == 0
            and self.input["saudara_laki_seayah"] == 0
            and self.input["keponakan_kandung"] == 0
            and self.input["keponakan_seayah"] == 0
        )

    def _can_take_paternal_uncle(self) -> bool:
        return (
            self.input["paman_seayah"] > 0
            and self.input["paman_kandung"] == 0
            and self.input["anak_laki"] == 0
            and self.input["cucu_laki"] == 0
            and self.input["cicit_laki"] == 0
            and self.input["ayah"] == 0
            and self.input["kakek_ayah"] == 0
            and self.input["saudara_laki_kandung"] == 0
            and self.input["saudara_laki_seayah"] == 0
            and self.input["keponakan_kandung"] == 0
            and self.input["keponakan_seayah"] == 0
        )


def hitung_waris(request: HitungRequest) -> HitungResponse:
    calculator = WarisCalculator(request)
    calculator.identifikasi_ahli_waris()
    calculator.tentukan_mahjub()
    calculator.tentukan_bagian_furudh()
    calculator.tentukan_ashabah()
    calculator.hitung_asal_masalah()
    calculator.hitung_saham()
    calculator.deteksi_aul_radd()
    calculator.hitung_nominal()
    return calculator.build_response()
