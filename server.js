const express = require('express');
const sql = require('msnodesqlv8');
const path = require('path');

const app = express();
const port = 3000;

const connectionString = "server=.;Database=QLKS_LAOPERA;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
const kh = "SELECT * FROM KHACHHANG";
const p = "SELECT MALOAIP, COUNT(*) AS AVAILABLE_ROOMS FROM PHONG GROUP BY MALOAIP";
const p1 = "SELECT MALOAIP, COUNT(*) - 1 AS AVAILABLE_ROOMS FROM PHONG GROUP BY MALOAIP";
const p2 = "SELECT MALOAIP, SUM(c.SOLUONG) AS AVAILABLE_ROOMS FROM PHIEUDATPHONG p INNER JOIN CHITIETPDP c ON p.MAPDP = c.MAPDP WHERE p.NGAYNHAN < ? AND p.NGAYTRA > ? GROUP BY MALOAIP";
var arDay = ''
var deDay =''
var p3 = ''

sql.query(connectionString, p3, (err, rows) => {
    if (err) {
        console.error("Error querying database:", err);
    } else {
        console.log(rows);
    }
});

// Cấu hình để phục vụ các tệp tĩnh từ thư mục hiện tại
app.use(express.static(path.join(__dirname)));

app.use(express.json());

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post("/contact", (req, res) => {
    const { fullName, identity, sex, birthDate, email, phone, address, nationality, arrDate, deDate, price, discount, total, selectedRoomsData } = req.body;
    const insertQuery = `
        INSERT INTO KHACHHANG (TENKH, CCCD, GIOITINH, NGAYSINH, EMAIL, LOAIKH, SDT, DIACHI, QUOCTICH, TINHTRANG)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 1)
    `;
    const params = [fullName, identity, sex, birthDate, email, phone, address, nationality];

    sql.query(connectionString, insertQuery, params, (err, result) => {
        if (err) {
            console.error("Error inserting data:", err);
            res.status(500).send("Error inserting data into database");
        } else {
            console.log("Data inserted successfully");
            res.status(200).send("Data inserted successfully");
        }
    });
});

app.post("/getdate", (req, res) => {
    const { arrivalDate, departureDate } = req.body;
    console.log(arrivalDate);
    console.log(departureDate);

    if (arrivalDate && departureDate) {
         arDay = `'${arrivalDate}'`
         deDay = `'${departureDate}'`
        p3 =  `
            SELECT p.MALOAIP, (p.AVAILABLE_ROOMS - COALESCE(p2.AVAILABLE_ROOMS, 0)) AS AVAILABLE_ROOMS
            FROM (
                SELECT MALOAIP, COUNT(*) AS AVAILABLE_ROOMS
                FROM PHONG
                GROUP BY MALOAIP
            ) AS p
            LEFT JOIN (
                SELECT MALOAIP, SUM(c.SOLUONG) AS AVAILABLE_ROOMS
                FROM PHIEUDATPHONG p
                INNER JOIN CHITIETPDP c ON p.MAPDP = c.MAPDP
                WHERE p.NGAYNHAN < ${arDay} AND p.NGAYTRA > ${deDay}
                GROUP BY MALOAIP
            ) AS p2 ON p.MALOAIP = p2.MALOAIP
        `;
    } else {
        res.status(400).json({ error: "Missing arrivalDate or departureDate" });
    }
});


app.get("/rooms", (req, res) => {
    console.log(p3)
    sql.query(connectionString, p3, (err, rows) => {
        if (err) {
            console.error("Error querying rooms:", err);
            res.status(500).json({ error: "Error querying rooms" });
        } else {
            res.status(200).json(rows);
        }
    });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
