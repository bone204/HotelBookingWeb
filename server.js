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

app.post("/contact", async (req, res) => {
    const { fullName, identity, sex, birthDate, email, phone, address, nationality, arrDate, deDate, discount, total, selectedRoomsData } = req.body;

    console.log(discount);
    console.log(total);
    console.log(selectedRoomsData);

    let quocTich = nationality;
    let loaiKhachHang = 2;

    if (nationality === "Vietnam") {
        quocTich = "Việt Nam";
        loaiKhachHang = 1;
    }

    const currentDateTime = new Date();

    const insertCustomerQuery = `
        INSERT INTO KHACHHANG (TENKH, CCCD, GIOITINH, NGAYSINH, EMAIL, LOAIKH, SDT, DIACHI, QUOCTICH, TINHTRANG)
        OUTPUT INSERTED.MAKH
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    const insertBookingQuery = `
        INSERT INTO PHIEUDATPHONG (MAKH, TGDAT, NGAYNHAN, NGAYTRA, HINHTHUC)
        OUTPUT INSERTED.MAPDP
        VALUES (?, ?, ?, ?, 'Online')
    `;

    const insertInvoiceQuery = `
        INSERT INTO HOADONPHONG (MAPDP, NVNHAP, NGAYTAO, TRANGTHAI)
        VALUES (?, 'NV002', ?, 1)
    `;

    const insertBookingDetailQuery = `
        INSERT INTO CHITIETPDP (MAPDP, MALOAIP, SOLUONG)
        VALUES (?, ?, ?)
    `;

    // Function to map room types to MALOAIP
    function getMALOAIP(roomType) {
        switch (roomType) {
            case 'Deluxe Room':
                return 2;
            case 'Standard Room':
                return 1;
            case 'Premium Room':
                return 3;
            case 'La Opera Room':
                return 4;
            default:
                throw new Error(`Unknown room type: ${roomType}`);
        }
    }

    try {
        sql.open(connectionString, async (err, conn) => {
            if (err) {
                console.error("Error connecting to the database:", err);
                res.status(500).send("Error connecting to the database");
                return;
            }

            conn.query(insertCustomerQuery, [fullName, identity, sex, birthDate, email, loaiKhachHang, phone, address, quocTich], (err, customerResult) => {
                if (err) {
                    console.error("Error inserting customer:", err);
                    res.status(500).send("Error inserting customer into database");
                    return;
                }

                const MAKH = customerResult[0].MAKH;

                conn.query(insertBookingQuery, [MAKH, currentDateTime, arrDate, deDate], (err, bookingResult) => {
                    if (err) {
                        console.error("Error inserting booking:", err);
                        res.status(500).send("Error inserting booking into database");
                        return;
                    }

                    const MAPDP = bookingResult[0].MAPDP;

                    selectedRoomsData.forEach((room) => {
                        const MALOAIP = getMALOAIP(room.room);

                        conn.query(insertBookingDetailQuery, [MAPDP, MALOAIP, room.quantity], (err) => {
                            if (err) {
                                console.error("Error inserting booking detail:", err);
                                res.status(500).send("Error inserting booking detail into database");
                                return;
                            }
                        });
                    });

                    conn.query(insertInvoiceQuery, [MAPDP,currentDateTime], (err) => {
                        if (err) {
                            console.error("Error inserting invoice:", err);
                            res.status(500).send("Error inserting invoice into database");
                            return;
                        }

                        res.status(200).send("Data inserted successfully");
                    });
                });
            });
        });
    } catch (err) {
        console.error("Error inserting data:", err);
        res.status(500).send("Error inserting data into database");
    }
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
