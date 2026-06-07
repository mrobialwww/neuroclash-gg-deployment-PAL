# 🚀 High Availability Web Application dengan AWS Auto Scaling Group & Application Load Balancer

> **Proyek Akhir – Genap 2025/2026**  
> Universitas Brawijaya  
> Dosen Pengampu: Widhi Yahya, S.Kom., M.Sc., M.T., Ph.D.

**Anggota Kelompok:**
| No | Nama | NIM |
|----|------|-----|
| 1 | Mohamad Robi Alwan | 235150200111025 |
| 2 | Khairumam Fikri | 235150200111034 |
| 3 | Reyno Benedict | 235150207111048 |

---

## 📋 Daftar Isi

1. [Deskripsi Proyek](#-deskripsi-proyek)
2. [Arsitektur Sistem](#-arsitektur-sistem)
3. [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
4. [Prasyarat](#-prasyarat)
5. [Struktur Repositori](#-struktur-repositori)
6. [Panduan Implementasi Lengkap](#-panduan-implementasi-lengkap)
   - [Fase 1 – Persiapan AWS Academy dan Repositori GitHub](#fase-1--persiapan-aws-academy-dan-repositori-github)
   - [Fase 2 – Konfigurasi Security Group](#fase-2--konfigurasi-security-group)
   - [Fase 3 – EC2 Instance Manual, AMI](#fase-3--ec2-instance-manual-dan-ami)
   - [Fase 4 – Launch Template dengan vockey dan LabRole](#fase-4--launch-template-dengan-vockey-dan-labrole)
   - [Fase 5 – Application Load Balancer](#fase-5--application-load-balancer)
   - [Fase 6 – Auto Scaling Group](#fase-6--auto-scaling-group)
   - [Fase 7 – CloudWatch dan Scaling Policy](#fase-7--cloudwatch-dan-scaling-policy)
   - [Fase 8 – Verifikasi Deployment via Git Clone](#fase-8--verifikasi-deployment-via-git-clone)
   - [Fase 9 – Pengujian Sistem](#fase-9--pengujian-sistem)
7. [Hasil Pengujian](#-hasil-pengujian)
8. [Troubleshooting](#-troubleshooting)

---

## 📝 Deskripsi Proyek

Proyek ini mengimplementasikan sistem **High Availability** untuk web application Node.js menggunakan layanan **Amazon Web Services (AWS)**. Kode aplikasi di-host di GitHub dan setiap EC2 instance yang baru di-launch oleh ASG akan otomatis melakukan `git clone` dari repositori untuk mendapatkan versi kode terbaru — tidak ada hardcode kode aplikasi di dalam script.

Kemampuan sistem:

- Distribusi trafik otomatis via **Application Load Balancer (ALB)**
- Scaling otomatis berdasarkan CPU utilization via **Auto Scaling Group (ASG)**
- Monitoring real-time via **Amazon CloudWatch**
- Pull kode terbaru otomatis dari **GitHub** (`git clone`) saat instance baru dibuat
- Health check dan auto-recovery instance yang gagal
- Zero-downtime deployment

---

## 🏗️ Arsitektur Sistem

```
                    ┌─────────────┐
                    │    User     │
                    └──────┬──────┘
                           │ HTTP Request
                           ▼
              ┌────────────────────────┐
              │  Application Load      │
              │  Balancer (ALB)        │
              │  sg-alb-pal | Port 80  │
              └────────────┬───────────┘
                           │ Distribusi Trafik (Round Robin)
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │EC2 Inst 1│ │EC2 Inst 2│ │EC2 Inst N│
       │Node.js   │ │Node.js   │ │Node.js   │
       │Port 3000 │ │Port 3000 │ │Port 3000 │
       └──────────┴─┴──────────┴─┴──────────┘
         Key: vockey | IAM Role: LabRole
              └─────── Auto Scaling Group ────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Amazon CloudWatch     │
              │  CPU Monitoring        │
              │  & Scaling Trigger     │
              └────────────────────────┘

  Saat instance baru boot:
  EC2 User Data → git clone github.com/mrobialwww/neuroclash-gg → npm install → pm2 start
```

---

## 🛠️ Teknologi yang Digunakan

| Komponen        | Teknologi                          | Keterangan                             |
| --------------- | ---------------------------------- | -------------------------------------- |
| Cloud Platform  | AWS Academy Learner Lab            | Region us-east-1                       |
| Compute         | Amazon EC2 (t2.micro)              | Free tier eligible                     |
| Key Pair        | **`vockey`** (bawaan Learner Lab)  | Jangan buat key pair baru              |
| IAM Role        | **`LabRole`** (bawaan Learner Lab) | Wajib agar instance akses AWS services |
| Load Balancer   | Application Load Balancer          | Layer 7, port 80                       |
| Auto Scaling    | Auto Scaling Group                 | Min 1, Desired 2, Max 4                |
| Monitoring      | Amazon CloudWatch                  | CPU metric dan alarm                   |
| Source Code     | GitHub via `git clone`             | `mrobialwww/neuroclash-gg`             |
| Runtime         | Node.js 20.x + Express             | Subfolder `/app`                       |
| Process Manager | PM2                                | Auto-restart dan survive reboot        |

---

## ⚙️ Prasyarat

**Di AWS Academy Learner Lab:**

- Akun AWS Academy aktif, Learner Lab sudah di-**Start**
- Status Lab: **Ready** (lampu indikator hijau)
- Region aktif: **us-east-1** (default Learner Lab)
- Key Pair `vockey` sudah tersedia — tidak perlu dibuat, sudah ada bawaan lab
- IAM Role `LabRole` sudah tersedia — tidak perlu dibuat, sudah ada bawaan lab

**Di Repositori GitHub:**

- Repo `https://github.com/mrobialwww/neuroclash-gg` bersifat **public**

  > ⚠️ **Wajib public** agar EC2 bisa `git clone` tanpa autentikasi. Jika private, lihat bagian [Jika Repo Private](#jika-repo-private) di bawah.

- File `app/server.js` sudah ada dan memiliki endpoint `GET /health` yang return HTTP 200
- File `app/package.json` sudah ada dengan script `"start": "node server.js"`

---

## 📁 Struktur Repositori

```
neuroclash-gg/                  ← root repo GitHub
│
├── app/
│   ├── server.js               ← Entry point Node.js (WAJIB ada endpoint /health)
│   ├── package.json            ← Dependencies dan scripts
│   └── package-lock.json
│
├── scripts/
│   ├── user-data.sh            ← Referensi script bootstrap EC2
│   └── load-test.sh            ← Script load testing
│
├── docs/
│   └── screenshots/            ← Screenshot hasil implementasi dan pengujian
│
└── README.md
```

### Endpoint `/health` Wajib Ada di `app/server.js`

ALB menggunakan endpoint ini untuk health check. Jika tidak ada, semua instance akan dianggap **Unhealthy** dan traffic tidak akan pernah dikirim.

```javascript
// app/server.js — pastikan endpoint ini ada
const express = require("express");
const os = require("os");
const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send(`
    <h1>NeuroClash GG</h1>
    <p>Instance: <strong>${os.hostname()}</strong></p>
    <p>Time: ${new Date().toISOString()}</p>
  `);
});

// WAJIB: dipakai ALB untuk health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
```

### `app/package.json` Minimal

```json
{
  "name": "neuroclash-gg",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

---

## 📖 Panduan Implementasi Lengkap

> **Sebelum mulai, pastikan:**
>
> - Lab sudah **Start** dan status **Ready**
> - Semua resource dibuat di region **us-east-1**
> - Gunakan Key Pair **`vockey`** — jangan buat Key Pair baru
> - Gunakan IAM Role **`LabRole`** — jangan buat IAM Role baru
> - Repo GitHub sudah **public**

---

### Fase 1 – Persiapan AWS Academy dan Repositori GitHub

#### 1.1 Start Lab dan Download Key Pair vockey

**Dikerjakan di: Browser → AWS Academy Canvas**

1. Login ke **AWS Academy** → masuk ke course → klik **Learner Lab**
2. Klik tombol **▶ Start Lab** → tunggu indikator berubah hijau (~2 menit)
3. Klik **AWS Details**:

   - Klik **Download PEM** → simpan sebagai `labsuser.pem`

     > File `labsuser.pem` adalah private key dari Key Pair **`vockey`** yang sudah ada di AWS. Kamu hanya men-download-nya, bukan membuat key pair baru.

4. Set permission file di terminal laptop:
   ```bash
   chmod 400 labsuser.pem
   ```
5. Klik tombol **AWS** (logo orange) → AWS Management Console terbuka

> **Catatan:** Session Learner Lab aktif 4 jam. Semua resource EC2/ALB/ASG tetap ada jika lab habis dan di-start ulang, tapi credentials (Access Key, Secret Key, Session Token) akan berubah.

#### 1.2 Pastikan Repositori GitHub Siap

**Dikerjakan di: Browser → GitHub.com**

1. Buka `https://github.com/mrobialwww/neuroclash-gg`
2. Pastikan repo **Public** (tidak ada ikon 🔒 di nama repo)
3. Cek bahwa `app/server.js` sudah punya endpoint `/health`
4. Jika ada perubahan yang perlu di-push:
   ```bash
   git add app/server.js app/package.json
   git commit -m "Ensure /health endpoint exists for ALB health check"
   git push origin main
   ```

---

### Fase 2 – Konfigurasi Security Group

**Dikerjakan di: AWS Console → EC2 → Security Groups**

Buat dua Security Group secara terpisah. Urutan pembuatan: **ALB dulu, baru EC2** — karena Security Group EC2 akan mereferensikan SG ALB sebagai source.

#### 2.1 Security Group untuk ALB

1. EC2 Console → panel kiri → **Security Groups** → **Create security group**
2. Isi:
   - **Security group name:** `sg-alb-pal`
   - **Description:** `SG untuk Application Load Balancer PAL`
   - **VPC:** pilih VPC default
3. **Inbound rules:**

   | Type | Protocol | Port | Source    |
   | ---- | -------- | ---- | --------- |
   | HTTP | TCP      | 80   | 0.0.0.0/0 |

4. Outbound rules: biarkan default
5. Klik **Create security group**
6. **Catat Security Group ID** (format `sg-xxxxxxxxxxxxxxxxx`)

#### 2.2 Security Group untuk EC2 Instance

1. **Create security group** lagi
2. Isi:
   - **Security group name:** `sg-ec2-nodejs-pal`
   - **Description:** `SG untuk EC2 Node.js instances PAL`
   - **VPC:** pilih VPC default
3. **Inbound rules** — tambahkan 2 rule:

   | Type       | Protocol | Port | Source                | Keterangan                      |
   | ---------- | -------- | ---- | --------------------- | ------------------------------- |
   | SSH        | TCP      | 22   | My IP                 | SSH dari laptop kamu saja       |
   | Custom TCP | TCP      | 3000 | Custom → `sg-alb-pal` | Hanya ALB boleh akses port 3000 |

   > Cara pilih SG sebagai source: klik kolom Source → pilih **Custom** → ketik `sg-alb-pal` → pilih dari dropdown.

4. Klik **Create security group**

> **Mengapa port 3000 hanya dari `sg-alb-pal`?** Ini best practice: EC2 tidak boleh diakses langsung dari internet. Hanya ALB yang menjadi pintu masuk trafik ke aplikasi.

---

### Fase 3 – EC2 Instance Manual dan AMI

Instance ini dibuat **sekali untuk tujuan testing**. Setelah berjalan normal, kita ambil AMI-nya agar Launch Template punya base image yang sudah include Node.js dan PM2 — sehingga instance baru dari ASG tidak perlu install dari nol (lebih cepat boot).

#### 3.1 Launch EC2 Instance Manual

**Dikerjakan di: AWS Console → EC2 → Launch instances**

1. Klik **Launch instances**
2. **Name:** `ec2-nodejs-manual-test`
3. **AMI:** pilih **Amazon Linux 2023 AMI** (Free tier eligible, 64-bit x86)
4. **Instance type:** `t2.micro`
5. **Key pair:** pilih **`vockey`** dari dropdown

   > ⚠️ Jangan klik "Create new key pair". Pilih `vockey` yang sudah ada.

6. **Network settings:**

   - VPC: default
   - Subnet: pilih subnet di **`us-east-1a`**
   - **Auto-assign public IP: Enable**
   - Firewall: **Select existing security group** → pilih `sg-ec2-nodejs-pal`

7. **Advanced details:**

   - **IAM instance profile:** pilih **`LabRole`**

     > ⚠️ **Wajib diisi.** Tanpa `LabRole`, instance tidak bisa mengirim metrics ke CloudWatch, tidak bisa akses Secrets Manager, dan berbagai layanan AWS lainnya dari dalam instance. Ini adalah penyebab paling umum kegagalan di lingkungan AWS Academy Learner Lab.

   - **User data:** copy-paste script berikut:

```bash
#!/bin/bash
# ============================================================
# User Data – EC2 Manual Test (Next.js Version)
# ============================================================

# 1. Buat Swap Memory (Mencegah instance freeze saat build Next.js di t2.micro)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. Update sistem dan install git
yum update -y
yum install -y git

# 3. Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# 4. Install PM2 secara global
npm install -g pm2

# 5. Clone repositori dari GitHub
cd /home/ec2-user
git clone https://github.com/mrobialwww/neuroclash-gg.git

# 6. Masuk ke root direktori (tempat package.json berada) dan install dependencies
cd /home/ec2-user/neuroclash-gg
npm install

# 7. Set Environment Variables & Matikan Telemetry
cat <<EOT >> /home/ec2-user/neuroclash-gg/.env
NEXT_PUBLIC_SUPABASE_URL=isi_dengan_url_asli_supabase_kamu
NEXT_PUBLIC_SUPABASE_ANON_KEY=isi_dengan_key_asli_supabase_kamu
EOT
export NEXT_TELEMETRY_DISABLED=1

# 8. Build aplikasi Next.js
npm run build

# 9. Fix ownership (Lakukan sebelum PM2 jalan agar tidak ada isu permission)
chown -R ec2-user:ec2-user /home/ec2-user/neuroclash-gg

# 10. Jalankan aplikasi Next.js dengan PM2
pm2 start npm --name "neuroclash-app" -- start

# 11. Simpan konfigurasi PM2 agar auto-start setelah reboot
pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# Fix ownership
chown -R ec2-user:ec2-user /home/ec2-user/neuroclash-gg
```

8. Klik **Launch instance**
9. Tunggu status **Running** dan **2/2 checks passed** (~3–5 menit)

### 3.2 Verifikasi Aplikasi Berjalan

Secara **best practice** dalam arsitektur **High Availability**, **instance** EC2 tidak boleh diakses secara publik untuk verifikasi aplikasi.

Oleh karena itu, verifikasi aplikasi pada tahap ini **wajib** dilakukan secara internal.

Klik instance → copy **Public IPv4 address**

1. **Masuk ke dalam instance EC2 melalui SSH:**

```bash
ssh -i labsuser.pem ec2-user@[PUBLIC-IP-INSTANCE]
```

2. **Pastikan aplikasi Next.js berjalan stabil di PM2:**

Cek status _process manager_ untuk memastikan aplikasi tidak mengalami _crash_ setelah proses _build_ selesai.

```bash
sudo pm2 status
```

**Output yang diharapkan:**  
Proses `neuroclash-app` berstatus `online` dengan angka `0` pada kolom restart (↺).

3. **Uji endpoint health check secara lokal:**

Lakukan _request_ langsung ke `localhost` untuk mem-bypass Security Group dan memastikan aplikasi siap melayani _request_ dari Load Balancer nantinya.

```bash
curl http://localhost:3000/api/health
```

**Output yang diharapkan:**  
Mengembalikan respons JSON seperti:

```json
{
  "status": "healthy",
  "timestamp": "..."
}
```

### Catatan Troubleshooting

Jika `curl` gagal atau PM2 berstatus `errored`, periksa log aplikasi untuk melihat detail _error_ (misalnya masalah _environment variables_ Supabase atau kegagalan kompilasi) dengan perintah:

```bash
sudo pm2 logs neuroclash-app --lines 30
```

#### 3.3 Buat AMI dari Instance

**Dikerjakan di: AWS Console → EC2 → Instances**

1. Klik kanan instance `ec2-nodejs-manual-test` → **Image and templates** → **Create image**
2. Isi:
   - **Image name:** `ami-neuroclash-nodejs`
   - **Image description:** `AMI Node.js 20 + PM2 untuk HA deployment via git clone`
   - **No reboot:** ✅ centang (instance tidak restart saat pembuatan AMI)
3. Klik **Create image**
4. Menu **AMIs** di panel kiri → tunggu status **Available** (~5–10 menit)
5. **Catat AMI ID** (format: `ami-xxxxxxxxxxxxxxxxx`)

---

### Fase 4 – Launch Template dengan vockey dan LabRole

Launch Template adalah blueprint yang digunakan ASG setiap kali perlu launch instance baru. Di sinilah `vockey`, `LabRole`, dan script `git clone` dikonfigurasi secara terpusat.

**Dikerjakan di: AWS Console → EC2 → Launch Templates**

1. Klik **Create launch template**

2. **Launch template name:** `lt-neuroclash-ha-pal`
3. **Template version description:** `v1 - Node.js deploy via git clone`

4. **AMI:** klik tab **My AMIs** → pilih `ami-neuroclash-nodejs`

   > AMI ini sudah include Node.js dan PM2. User Data di Launch Template hanya perlu `git clone` + `npm install` + `pm2 start` — jauh lebih cepat dari install dari nol.

5. **Instance type:** `t2.micro`

6. **Key pair:** pilih **`vockey`**

   > ⚠️ Ini Key Pair bawaan Learner Lab. Wajib `vockey`, bukan key pair buatan sendiri.

7. **Security groups:** pilih `sg-ec2-nodejs-pal`

   > Jangan set subnet di Launch Template — biarkan ASG yang menentukan subnet/AZ saat launch.

8. **Advanced details:**

   - **IAM instance profile:** pilih **`LabRole`**

     > ⚠️ **Sangat penting dan wajib.** Tanpa ini, instance baru dari ASG tidak akan bisa mengirim CPU metrics ke CloudWatch, sehingga autoscaling tidak akan bekerja. Ini juga penyebab utama error "Permission Denied" di lingkungan lab mahasiswa.

   - **User data:** copy-paste script berikut:

```bash
#!/bin/bash
# ============================================================
# User Data – Launch Template (Fase 4 - ASG Next.js Version)
# AMI sudah membawa Node.js, PM2, dan Swap Memory 1GB.
# ============================================================

# 1. Hapus hasil clone lama (bawaan dari snapshot AMI) agar benar-benar fresh
rm -rf /home/ec2-user/neuroclash-gg

# 2. Clone kode terbaru dari branch main di GitHub
cd /home/ec2-user
git clone https://github.com/mrobialwww/neuroclash-gg.git
cd /home/ec2-user/neuroclash-gg

# 3. Install dependencies
npm install

# 4. Set Environment Variables & Matikan Telemetry
cat <<EOT >> /home/ec2-user/neuroclash-gg/.env
NEXT_PUBLIC_SUPABASE_URL=isi_dengan_url_asli_supabase_kamu
NEXT_PUBLIC_SUPABASE_ANON_KEY=isi_dengan_key_asli_supabase_kamu
EOT
export NEXT_TELEMETRY_DISABLED=1

# 5. Build aplikasi Next.js (Aman karena Swap Memory dari AMI sudah aktif)
npm run build

# 6. Fix ownership untuk menghindari isu permission pada PM2
chown -R ec2-user:ec2-user /home/ec2-user/neuroclash-gg

# 7. Jalankan aplikasi Next.js menggunakan PM2
pm2 start npm --name "neuroclash-app" -- start
pm2 save
```

9. Klik **Create launch template** ✅
10. **Catat Launch Template ID**

> **Mengapa `git clone` di User Data, bukan bake ke AMI?**
> Karena dengan `git clone`, setiap instance baru yang di-launch ASG (saat scaling out) akan **selalu mengambil commit terbaru** dari branch `main`. Jika kamu push bugfix ke GitHub, instance berikutnya otomatis pakai kode yang sudah diperbaiki — tanpa perlu rebuild AMI.

---

### Fase 5 – Application Load Balancer

#### 5.1 Buat Target Group

Target Group mendefinisikan ke mana traffic dikirim dan bagaimana health check dilakukan.

**Dikerjakan di: AWS Console → EC2 → Target Groups**

1. **Create target group**
2. **Target type:** Instances
3. **Target group name:** `tg-neuroclash-pal`
4. **Protocol:** HTTP | **Port:** `3000`
5. **VPC:** Default VPC
6. **Health check path:** `/health`
7. Expand **Advanced health check settings:**
   - Healthy threshold: `2`
   - Unhealthy threshold: `3`
   - Timeout: `5` seconds
   - Interval: `30` seconds
   - Success codes: `200`
8. Klik **Next** → di halaman Register targets, **jangan tambahkan instance** (ASG yang mendaftarkan otomatis)
9. Klik **Create target group** ✅
10. **Catat Target Group ARN**

#### 5.2 Buat Application Load Balancer

**Dikerjakan di: AWS Console → EC2 → Load Balancers**

1. **Create load balancer** → pilih **Application Load Balancer** → **Create**
2. **Name:** `alb-neuroclash-pal`
3. **Scheme:** Internet-facing | **IP address type:** IPv4
4. **Network mapping:**

   - VPC: Default VPC
   - **Availability Zones:** centang **minimal 2 AZ** (misal `us-east-1a` dan `us-east-1b`)

   > ALB membutuhkan minimal 2 AZ untuk berfungsi sebagai high availability.

5. **Security groups:** hapus default → tambahkan `sg-alb-pal`
6. **Listeners:** HTTP:80 → Default action: Forward to `tg-neuroclash-pal`
7. Klik **Create load balancer** ✅
8. Tunggu status **Active** (~2–3 menit)
9. **Catat DNS name ALB** — contoh: `alb-neuroclash-pal-1234567890.us-east-1.elb.amazonaws.com`

Test di browser: `http://[DNS-ALB]` → akan dapat **503** dulu (normal, belum ada instance di Target Group).

---

### Fase 6 – Auto Scaling Group

**Dikerjakan di: AWS Console → EC2 → Auto Scaling Groups**

1. **Create Auto Scaling group**

**Step 1 – Choose launch template:**

- **Name:** `asg-neuroclash-pal`
- **Launch template:** `lt-neuroclash-ha-pal` | Version: **Default (Latest)**
- Klik **Next**

**Step 2 – Choose instance launch options:**

- **VPC:** Default VPC
- **Availability Zones:** pilih **semua subnet** di AZ yang sama dengan ALB (minimal `us-east-1a` dan `us-east-1b`)
- Klik **Next**

**Step 3 – Configure advanced options:**

- **Load balancing:** ✅ Attach to an existing load balancer
  - Choose from target groups → pilih `tg-neuroclash-pal`
- **Health checks:**

  - ✅ Turn on Elastic Load Balancing health checks
  - Health check grace period: `120` seconds

  > 120 detik memberi waktu cukup untuk boot + git clone + npm install sebelum health check pertama berjalan.

- ✅ **Enable group metrics collection within CloudWatch**

  > Wajib diaktifkan agar CloudWatch bisa collect metric `GroupInServiceInstances` dan alarm scaling bekerja.

- Klik **Next**

**Step 4 – Configure group size and scaling:**

- Desired: `2` | Minimum: `1` | Maximum: `4`
- **Automatic scaling:** ✅ Target tracking scaling policy
  - Policy name: `policy-cpu-target-tracking`
  - Metric type: **Average CPU utilization**
  - Target value: `50`
  - Instance warmup: `120` seconds
- Klik **Next**

**Step 5:** skip (Next)

**Step 6 – Tags:**
| Key | Value |
|-----|-------|
| Name | `ec2-neuroclash-asg` |
| Project | `PAL-HA-NodeJS` |

Klik **Next**

**Step 7 – Review:** pastikan Launch Template pakai `vockey` dan `LabRole` → **Create Auto Scaling group** ✅

#### 6.1 Pantau Proses Launch

1. **EC2 → Instances** → dalam 3–5 menit muncul 2 instance baru bernama `ec2-neuroclash-asg`
2. **ASG → Activity tab** → lihat log "Launching a new EC2 instance"
3. **Target Groups → tg-neuroclash-pal → Targets** → tunggu kedua instance **Healthy**
4. Buka browser: `http://[DNS-ALB]` → **halaman aplikasi harus muncul** ✅

**Verifikasi load balancing:**

```bash
# Jalankan beberapa kali, hostname harus bergantian
for i in {1..6}; do
  curl -s http://[DNS-ALB]/health
  echo ""
done
```

---

### Fase 7 – CloudWatch dan Scaling Policy

Target Tracking Policy di Fase 6 sudah otomatis membuat alarm CloudWatch dasar. Kita tambahkan alarm eksplisit untuk kontrol lebih detail dan keperluan dokumentasi.

**Dikerjakan di: AWS Console → CloudWatch**

#### 7.1 Alarm Scale-Out (CPU Tinggi → Tambah Instance)

1. CloudWatch → **Alarms** → **Create alarm** → **Select metric**
2. Navigasi: **EC2** → **By Auto Scaling Group** → cari `CPUUtilization` untuk `asg-neuroclash-pal` → **Select metric**
3. **Metric:**
   - Statistic: Average | Period: `1 minute`
4. **Conditions:**
   - Threshold: **Greater/Equal ≥ 70**
   - Datapoints to alarm: **2 out of 2** (CPU harus tinggi 2 menit berturut-turut)
5. **Actions (In alarm):**
   - Add Auto Scaling action → **Add 1 capacity unit** → ASG `asg-neuroclash-pal`
6. **Alarm name:** `alarm-neuroclash-cpu-high`
7. **Create alarm** ✅

#### 7.2 Alarm Scale-In (CPU Rendah → Kurangi Instance)

Ulangi langkah di atas:

- Threshold: **Less/Equal ≤ 30**
- Action: **Remove 1 capacity unit**
- **Alarm name:** `alarm-neuroclash-cpu-low`

#### 7.3 Buat Dashboard

1. CloudWatch → **Dashboards** → **Create dashboard** → name: `dashboard-neuroclash-ha`
2. Tambahkan widget:
   - **Line chart:** EC2 `CPUUtilization` per instance dalam ASG
   - **Number:** ASG metric `GroupInServiceInstances`
   - **Line chart:** ALB metric `RequestCount`
3. **Save dashboard** ✅

---

### Fase 8 – Verifikasi Deployment via Git Clone

Fase ini membuktikan bahwa pendekatan `git clone` bekerja dengan benar: setiap instance baru selalu punya kode terkini.

#### 8.1 Verifikasi Instance ASG Menjalankan Kode dari GitHub

```bash
# SSH ke salah satu instance ASG
ssh -i labsuser.pem ec2-user@[PUBLIC-IP-INSTANCE-ASG]

# Cek PM2 berjalan
pm2 status
# Output yang diharapkan:
# │ neuroclash-app │ online │

# Cek kode ada dan berasal dari git clone
ls /home/ec2-user/neuroclash-gg/app/
# Harus ada: server.js, package.json, node_modules/

# Cek commit yang sedang berjalan
cd /home/ec2-user/neuroclash-gg
git log --oneline -3
# Harus menampilkan commit terbaru dari GitHub

# Test endpoint
curl http://localhost:3000/health
```

#### 8.2 Test Update Kode Tanpa Rebuild AMI

Ini membuktikan keunggulan utama pendekatan git clone:

1. Buat perubahan di laptop, misal edit teks di `app/server.js`
2. Push ke GitHub:
   ```bash
   git add app/server.js
   git commit -m "Update halaman utama"
   git push origin main
   ```
3. Di AWS Console → **ASG** → **Instance refresh** → **Start instance refresh**
   - Minimum healthy percentage: `50`
   - Instance warmup: `120`
4. ASG rolling-replace instance lama dengan yang baru
5. Instance baru otomatis `git clone` → dapat kode terbaru
6. Akses `http://[DNS-ALB]` → perubahan langsung terlihat tanpa downtime ✅

---

### Fase 9 – Pengujian Sistem

#### 9.1 Load Testing dengan Apache Benchmark

**Dikerjakan di: Terminal laptop atau EC2 instance terpisah**

Install:

```bash
# Amazon Linux
sudo yum install -y httpd-tools

# Ubuntu/Debian
sudo apt-get install -y apache2-utils
```

Jalankan:

```bash
# Test ringan
ab -n 1000 -c 20 http://[DNS-ALB]/

# Test sedang
ab -n 5000 -c 50 http://[DNS-ALB]/

# Test berat untuk trigger autoscaling
ab -n 20000 -c 100 http://[DNS-ALB]/
```

Hasil penting yang dicek:

- `Failed requests: 0` ← tidak boleh ada failure
- `Requests per second` ← throughput sistem
- `Time per request` ← latency rata-rata

#### 9.2 CPU Stress Test untuk Trigger Autoscaling

**Dikerjakan di: SSH ke EC2 instance ASG**

```bash
ssh -i labsuser.pem ec2-user@[PUBLIC-IP]

# Install stress
sudo yum install -y stress

# Jalankan CPU stress 120 detik
stress --cpu $(nproc) --timeout 120s &

# Pantau CPU
top
```

**Pantau di CloudWatch + ASG:**

1. CloudWatch → Dashboard → lihat CPU spike ke >70%
2. Tunggu ~2 menit → alarm `alarm-neuroclash-cpu-high` masuk status **In alarm** 🔴
3. ASG → Activity tab → event "Launching a new EC2 instance"
4. EC2 Instances → instance ke-3 muncul, ASG Desired naik dari 2 → 3 ✅

#### 9.3 Failover Testing (Zero Downtime)

```bash
# Di terminal laptop, jalankan monitoring loop
while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://[DNS-ALB]/health)
  echo "$(date '+%H:%M:%S') - HTTP $STATUS"
  sleep 2
done
```

Sambil loop jalan:

1. AWS Console → EC2 → pilih salah satu instance ASG → **Instance State** → **Stop**
2. Pantau terminal → harus **tidak ada baris yang menampilkan status selain 200** (zero downtime)
3. Pantau Target Group → instance berubah: Healthy → Draining → Unhealthy
4. Pantau ASG Activity → "Launching replacement instance"
5. Instance pengganti baru muncul, otomatis git clone kode terbaru ✅

#### 9.4 AWS CLI untuk Monitoring

**Setup AWS CLI (dari credentials AWS Details di Learner Lab):**

```bash
aws configure
# Access Key ID: [dari AWS Details]
# Secret Access Key: [dari AWS Details]
# Region: us-east-1
# Output: json

# Wajib di Learner Lab: tambahkan session token
aws configure set aws_session_token [SESSION-TOKEN]
```

**Command berguna:**

```bash
# Status ASG
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names asg-neuroclash-pal \
  --query 'AutoScalingGroups[0].{Desired:DesiredCapacity,Min:MinSize,Max:MaxSize,Instances:Instances[*].{ID:InstanceId,Health:HealthStatus}}'

# History scaling
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name asg-neuroclash-pal \
  --max-items 10

# Health instance di Target Group
aws elbv2 describe-target-health \
  --target-group-arn [TARGET-GROUP-ARN]

# Force scale-out manual (untuk demo)
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name asg-neuroclash-pal \
  --desired-capacity 3

# Trigger instance refresh (rolling deploy kode terbaru dari GitHub)
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name asg-neuroclash-pal \
  --preferences '{"MinHealthyPercentage":50,"InstanceWarmup":120}'
```

---

### Jika Repo Private

Jika repo `neuroclash-gg` bersifat private, gunakan **GitHub Personal Access Token (PAT)**:

1. GitHub → Settings → Developer settings → Personal access tokens → Generate new token
2. Beri scope: `repo` (read)
3. Di User Data, ganti baris `git clone` menjadi:
   ```bash
   git clone https://mrobialwww:[YOUR-PAT]@github.com/mrobialwww/neuroclash-gg.git
   ```

> ⚠️ Token akan terlihat di User Data via AWS Console. Untuk keamanan lebih baik, simpan token di **AWS Secrets Manager** dan ambil dari dalam instance menggunakan AWS CLI (membutuhkan `LabRole` sudah terkonfigurasi).

Alternatif termudah untuk lab: **jadikan repo public** (Settings → Danger Zone → Change visibility).

---

## 📊 Hasil Pengujian

### Ringkasan

| Pengujian      | Kondisi                  | Hasil yang Diharapkan                        | Status |
| -------------- | ------------------------ | -------------------------------------------- | ------ |
| Akses via ALB  | Normal                   | Halaman app tampil, hostname bergantian      | ✅     |
| Load Test (ab) | 5000 req / 50 concurrent | 0 failed requests                            | ✅     |
| Health Check   | Semua instance running   | Status Healthy di Target Group               | ✅     |
| Failover       | Stop 1 instance          | Zero downtime                                | ✅     |
| Scale-Out      | CPU ≥ 70% selama 2 menit | Instance baru launch ~3–5 menit              | ✅     |
| Scale-In       | CPU ≤ 30%                | Instance dikurangi otomatis                  | ✅     |
| Git Clone      | Instance baru dari ASG   | Kode terbaru dari GitHub otomatis ter-deploy | ✅     |

### Konfigurasi Final

| Parameter                 | Nilai                                                       |
| ------------------------- | ----------------------------------------------------------- |
| AMI                       | `ami-neuroclash-nodejs`                                     |
| Instance Type             | `t2.micro`                                                  |
| Key Pair                  | `vockey` (bawaan Learner Lab)                               |
| IAM Role                  | `LabRole` (bawaan Learner Lab)                              |
| Source Code               | `git clone https://github.com/mrobialwww/neuroclash-gg.git` |
| Minimum Instances         | 1                                                           |
| Desired Instances         | 2                                                           |
| Maximum Instances         | 4                                                           |
| Scale-Out Trigger         | CPU ≥ 70% selama 2 menit                                    |
| Scale-In Trigger          | CPU ≤ 30%                                                   |
| Health Check Path         | `/health`                                                   |
| Health Check Grace Period | 120 detik                                                   |
| Instance Warmup           | 120 detik                                                   |

---

## 🔧 Troubleshooting

### ❌ ALB return 503 Service Unavailable

1. Cek **Target Group → Targets** → pastikan instance berstatus **Healthy**
2. Jika status **Initial** → masih dalam grace period, tunggu 2 menit
3. Jika **Unhealthy** → SSH ke instance, jalankan `curl localhost:3000/health`
4. Cek Security Group EC2: rule port 3000 harus source `sg-alb-pal`, bukan `0.0.0.0/0`

### ❌ User Data gagal / git clone error

```bash
# SSH ke instance, cek log
sudo cat /var/log/cloud-init-output.log | tail -80

# Error umum:
# "Repository not found"         → Repo belum public di GitHub
# "git: command not found"       → Tambahkan `yum install -y git` di awal script
# "npm: command not found"       → Node.js belum terinstall, cek nodesource setup
# "EACCES: permission denied"    → Cek `chown` di akhir script sudah benar
```

### ❌ Instance ASG tidak jalankan aplikasi (PM2 not running)

```bash
ssh -i labsuser.pem ec2-user@[PUBLIC-IP]

# Cek apakah git clone berhasil
ls /home/ec2-user/neuroclash-gg/app/

# Jalankan manual untuk debug
cd /home/ec2-user/neuroclash-gg/app
npm install
pm2 start server.js --name neuroclash-app
pm2 save

# Lihat log
pm2 logs neuroclash-app --lines 30
```

### ❌ LabRole tidak muncul di pilihan IAM instance profile

1. Pastikan kamu di **AWS Academy Learner Lab** (bukan AWS Free Tier biasa)
2. Buka **IAM → Roles** → search `LabRole` → harus ada
3. Jika tidak ada, hubungi instruktur lab

### ❌ ASG tidak scaling meski CPU tinggi

1. Pastikan **Group metrics collection** aktif di ASG (Edit ASG → Additional settings)
2. Cek CloudWatch Alarms → apakah status berubah ke **In alarm**?
3. Cek Scaling Policy di ASG sudah ada
4. Tunggu minimal 2 menit (alarm butuh 2 datapoints berturut-turut)

### ❌ AWS CLI error: `ExpiredTokenException`

```bash
# Session Learner Lab habis. Ambil credentials baru dari AWS Details lalu:
aws configure set aws_access_key_id [NEW-KEY]
aws configure set aws_secret_access_key [NEW-SECRET]
aws configure set aws_session_token [NEW-TOKEN]
```

### ❌ SSH error: `Permission denied (publickey)`

```bash
# Pastikan pakai labsuser.pem (dari Download PEM di AWS Academy)
ssh -i labsuser.pem ec2-user@[PUBLIC-IP]

# Fix permission jika perlu
chmod 400 labsuser.pem
```

---

## 📸 Checklist Screenshot untuk Laporan

- [ ] Halaman web di browser dengan DNS ALB sebagai URL
- [ ] Refresh beberapa kali → hostname berubah (bukti load balancing)
- [ ] Launch Template → Advanced details → **IAM instance profile: LabRole** ✅
- [ ] Launch Template → Key pair: **vockey** ✅
- [ ] Target Group → Targets → semua instance status **Healthy**
- [ ] ASG → Activity tab → log event launch instance
- [ ] CloudWatch → CPU metric spike saat stress test
- [ ] CloudWatch → alarm `alarm-neuroclash-cpu-high` dalam status **In alarm** 🔴
- [ ] ASG Activity → "Launching new EC2 instance" setelah alarm aktif
- [ ] SSH ke instance → `git log --oneline` menampilkan commit dari GitHub
- [ ] Terminal loop failover → tidak ada baris ERROR saat instance di-stop
- [ ] Hasil output `ab` (Apache Benchmark) dengan `Failed requests: 0`

---

## 📚 Referensi

1. AWS Documentation – [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
2. AWS Documentation – [EC2 Auto Scaling Groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html)
3. AWS Documentation – [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/)
4. AWS Documentation – [EC2 User Data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
5. Alharthi et al. (2024). Auto-Scaling Techniques in Cloud Computing. _Sensors_, 24(17), 5551.
6. Saxena et al. (2022). A fault tolerant elastic resource management framework. _IEEE TNSM_.

---
