cd server
py -m venv venv

copy past requirements.txt

cd server
py -m pip install -r requirements.txt
pip install -r requirements.txt
python -m pip install -r requirements.txt
( chạy 1 trong 3 lệnh ở trên )

cd server
.\venv\Scripts\activate

uvicorn app:app --reload
python -m uvicorn app:app --reload
(chạy 1 trong 2 lệnh)

cd client 
npm run dev


