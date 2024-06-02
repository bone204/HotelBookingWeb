const express = require('express');
const app = express();

const sql = require('msnodesqlv8');
const connectionString = "server=.;Database=QLKS_LAOPERA;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
const kh = "SELECT * FROM KHACHHANG";
const p1 = "SELECT * FROM PHONG";
const p = "SELECT MALOAIP, COUNT(*) AS AVAILABLE_ROOMS FROM PHONG WHERE MATRANGTHAI IN(1, 2) GROUP BY MALOAIP";


sql.query(connectionString, p, (err, rows) => {
    console.log(rows);
})

app.use('/assets', express.static(__dirname + '/assets'));

app.listen(3000);

app.use(express.json());

app.get("/home", (req,res) => {
    res.sendFile("index.html", {root: __dirname});
})

app.get("/rooms", (req, res) => {
    sql.query(connectionString, p, (err, rows) => {
        if (err) {
            console.error("Error querying rooms:", err);
            res.status(500).json({ error: "Error querying rooms" });
        } else {
            res.status(200).json(rows); // Gửi kết quả về dưới dạng JSON
        }
    });
});

app.post("/contact", (req, res) => {
    // Lấy dữ liệu từ req.body gửi từ frontend
    const { fullName, identity, sex, birthDate, email, phone, address, nationality } = req.body;

    // Tạo câu truy vấn SQL để chèn dữ liệu vào bảng KHACHHANG
    const insertQuery = `
        INSERT INTO KHACHHANG (TENKH, CCCD, GIOITINH, NGAYSINH, EMAIL, LOAIKH, SDT, DIACHI, QUOCTICH, TINHTRANG)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 1)
    `;

    // Mảng các tham số cho câu truy vấn SQL
    const params = [fullName, identity, sex, birthDate, email, phone, address, nationality];

    // Thực thi truy vấn SQL
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