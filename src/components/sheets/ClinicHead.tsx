import type { ClinicInfo } from "../../types";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${y}年 ${Number(m)}月 ${Number(d)}日`;
}

/** 各紙の右上：提出日 / 塾名 / 責任者 / TEL */
export function ClinicHead({ clinic, submitDate }: { clinic: ClinicInfo; submitDate: string }) {
  const date = fmtDate(submitDate);
  if (!date && !clinic.clinicName && !clinic.manager && !clinic.tel) return null;
  return (
    <div className="clinichead">
      {date && <div className="cdate">提出日　{date}</div>}
      {clinic.clinicName && <div>{clinic.clinicName}</div>}
      {clinic.manager && <div>責任者　{clinic.manager}</div>}
      {clinic.tel && <div>TEL　{clinic.tel}</div>}
    </div>
  );
}
