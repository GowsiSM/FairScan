from __future__ import annotations

from io import StringIO

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from store import get_download_df

router = APIRouter()


@router.get("/download/{token}")
def download_debiased_csv(token: str) -> StreamingResponse:
	df = get_download_df(token)
	if df is None:
		raise HTTPException(status_code=404, detail="Invalid or expired download token")

	csv_buffer = StringIO()
	df.to_csv(csv_buffer, index=False)
	csv_buffer.seek(0)

	return StreamingResponse(
		iter([csv_buffer.getvalue()]),
		media_type="text/csv",
		headers={"Content-Disposition": f'attachment; filename="fairscan_debiased_{token[:8]}.csv"'},
	)
