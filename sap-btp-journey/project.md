---
layout: default
title: "Dự Án Field Service to Cash"
---

# 🚀 Dự Án: Field Service to Cash (FSC)

## 📋 Tổng Quan Dự Án

**Field Service to Cash** là giải pháp end-to-end quản lý toàn bộ quy trình từ khi nhận yêu cầu dịch vụ hiện trường đến khi hoàn tất hóa đơn và thanh toán.

### Mục Tiêu Dự Án

- Tự động hóa quy trình field service
- Cải thiện trải nghiệm khách hàng
- Tăng hiệu quả làm việc của kỹ thuật viên
- Tích hợp liền mạch với hệ thống ERP (S/4HANA)

---

## 🏗️ Kiến Trúc Giải Pháp

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIELD SERVICE TO CASH                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Customer   │    │  Technician  │    │   Manager    │      │
│  │   Portal     │    │      App     │    │   Dashboard  │      │
│  │              │    │              │    │              │      │
│  │ SAP Build    │    │ SAP Build    │    │ SAP Fiori    │      │
│  │ Apps         │    │ Apps         │    │ / Analytics  │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   SAP Build     │                          │
│                    │   Process       │                          │
│                    │   Automation    │                          │
│                    │   (Workflow)    │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│  ┌──────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐        │
│  │   SAP        │  │    SAP        │  │    SAP        │        │
│  │  Integration │  │   HANA        │  │    S/4HANA    │        │
│  │    Suite     │  │   Cloud       │  │               │        │
│  │              │  │               │  │               │        │
│  │ - API Mgmt   │  │ - Database    │  │ - Finance     │        │
│  │ - iFlows     │  │ - Data Model  │  │ - Sales       │        │
│  │ - Connectors │  │ - Tables      │  │ - Service     │        │
│  └──────────────┘  └───────────────┘  └───────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Các Thành Phần Chính

| Component | Technology | Vai Trò |
|-----------|------------|---------|
| **Frontend** | SAP Build Apps | Ứng dụng mobile/web cho technicians và customers |
| **Workflow** | SAP Build Process Automation | Tự động hóa approval và business processes |
| **Integration** | SAP Integration Suite | Kết nối giữa các systems và APIs |
| **Database** | SAP HANA Cloud | Lưu trữ dữ liệu nghiệp vụ |
| **Backend** | SAP S/4HANA | Quản lý tài chính, bán hàng, service orders |
| **Analytics** | SAP Analytics Cloud | Báo cáo và dashboard (optional) |

---

## 📊 Quy Trình Nghiệp Vụ

### Flow Chính

```
1. YÊU CẦU DỊCH VỤ
   ↓
   Customer tạo service request qua portal/app
   ↓
2. PHÂN CÔNG
   ↓
   System tự động assign technician dựa trên:
   - Location
   - Skill set
   - Availability
   ↓
3. PHÊ DUYỆT
   ↓
   Manager review và approve service order
   ↓
4. THỰC HIỆN
   ↓
   Technician đến hiện trường, cập nhật status
   - Check-in/Check-out
   - Sử dụng vật tư
   - Ghi nhận thời gian
   ↓
5. HOÀN TẤT
   ↓
   Customer ký xác nhận hoàn thành dịch vụ
   ↓
6. HÓA ĐƠN
   ↓
   System tự động tạo invoice trong S/4HANA
   ↓
7. THANH TOÁN
   ↓
   Gửi invoice cho customer, theo dõi payment
```

---

## 🗂️ Data Model

### Các Bảng Chính

#### 1. ServiceRequest
```sql
CREATE TABLE ServiceRequest (
    id NVARCHAR(36) PRIMARY KEY,
    customerId NVARCHAR(36),
    description NVARCHAR(500),
    priority NVARCHAR(20),
    status NVARCHAR(20),
    requestedAt TIMESTAMP,
    scheduledAt TIMESTAMP,
    completedAt TIMESTAMP,
    location NVARCHAR(200),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8)
);
```

#### 2. Technician
```sql
CREATE TABLE Technician (
    id NVARCHAR(36) PRIMARY KEY,
    name NVARCHAR(100),
    email NVARCHAR(100),
    phone NVARCHAR(20),
    skills NVARCHAR(500),
    currentLocation NVARCHAR(200),
    availabilityStatus NVARCHAR(20)
);
```

#### 3. ServiceOrder
```sql
CREATE TABLE ServiceOrder (
    id NVARCHAR(36) PRIMARY KEY,
    serviceRequestId NVARCHAR(36),
    technicianId NVARCHAR(36),
    status NVARCHAR(20),
    assignedAt TIMESTAMP,
    startedAt TIMESTAMP,
    completedAt TIMESTAMP,
    materialsUsed NVARCHAR(1000),
    timeSpentMinutes INTEGER,
    customerSignature BLOB,
    notes NVARCHAR(1000)
);
```

#### 4. Material
```sql
CREATE TABLE Material (
    id NVARCHAR(36) PRIMARY KEY,
    code NVARCHAR(50),
    name NVARCHAR(200),
    unitPrice DECIMAL(10,2),
    stockQuantity INTEGER
);
```

#### 5. Invoice
```sql
CREATE TABLE Invoice (
    id NVARCHAR(36) PRIMARY KEY,
    serviceOrderId NVARCHAR(36),
    invoiceNumber NVARCHAR(50),
    totalAmount DECIMAL(10,2),
    status NVARCHAR(20),
    issuedAt TIMESTAMP,
    dueDate DATE,
    paidAt TIMESTAMP,
    s4hanaDocumentId NVARCHAR(50)
);
```

---

## 🔧 Triển Khai Chi Tiết

### Phase 1: Setup Environment (Tuần 12)

#### Bước 1.1: Provision Services trên BTP

1. **Kích hoạt các services:**
   - SAP Build Apps
   - SAP Build Process Automation
   - SAP Integration Suite
   - SAP HANA Cloud

2. **Cấu hình Subaccount:**
   ```
   Global Account → Trial
   └── Subaccount: fsc-project
       ├── Entitlements: Assign services
       ├── Trust Configuration
       └── Connectivity: Destinations
   ```

#### Bước 1.2: Tạo HANA Cloud Database

```sql
-- Tạo schema
CREATE SCHEMA FSC;

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA FSC TO FSC_USER;
```

#### Bước 1.3: Setup Git Repository

```bash
mkdir fsc-project
cd fsc-project
git init
mkdir -p src/{apps,workflows,integrations,database}
```

---

### Phase 2: Xây Dựng Frontend (Tuần 13)

#### Bước 2.1: SAP Build Apps - Technician App

**Screens cần tạo:**

1. **Login Screen**
   - Email input
   - Password input
   - Login button

2. **Home Dashboard**
   - Today's assignments count
   - Pending tasks
   - Quick actions

3. **Service Orders List**
   - Filter by status
   - Search functionality
   - Sort by priority/date

4. **Service Order Detail**
   - Customer information
   - Service description
   - Location map
   - Materials section

5. **Check-in/Check-out**
   - GPS capture
   - Timestamp
   - Photo upload

6. **Completion Form**
   - Time spent
   - Materials used
   - Customer signature pad
   - Notes

**Data Models trong Build Apps:**

```json
{
  "ServiceOrder": {
    "id": "string",
    "customerName": "string",
    "address": "string",
    "description": "string",
    "priority": "High|Medium|Low",
    "status": "Assigned|In Progress|Completed",
    "scheduledTime": "datetime",
    "latitude": "number",
    "longitude": "number"
  }
}
```

#### Bước 2.2: SAP Build Apps - Customer Portal

**Features:**
- Create service request
- Track request status
- View technician details
- Rate service quality
- View invoices

---

### Phase 3: Workflow Automation (Tuần 13-14)

#### Bước 3.1: Service Request Approval Process

**Process Design:**

```
Start → Validate Request → Auto-assign Technician 
→ Manager Approval (if high priority) → Notify Technician → End
```

**Configuration:**

1. **Form Builder:**
   - Service type dropdown
   - Priority selector
   - Description textarea
   - Attachment upload

2. **Decision Table:**
   ```
   IF priority = "High" AND cost > 1000 THEN require manager approval
   IF priority = "Medium" THEN auto-approve
   IF priority = "Low" THEN auto-approve with notification
   ```

3. **Email Notifications:**
   - Template cho technician assignment
   - Template cho customer confirmation
   - Template cho manager approval request

#### Bước 3.2: SLA Monitoring

```
Create Timer Event → Check if SLA breached 
→ Send escalation email → Update priority
```

---

### Phase 4: Integration (Tuần 14-15)

#### Bước 4.1: SAP Integration Suite Setup

**iFlow 1: Create Service Order in S/4HANA**

```
HTTP Sender (REST) → Content Modifier → OData Adapter (S/4HANA)
→ Response Mapping → HTTP Response
```

**Payload Example:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ServiceOrder>
    <OrderType>ZFSR</OrderType>
    <CustomerID>{{customerId}}</CustomerID>
    <Description>{{description}}</Description>
    <Priority>{{priority}}</Priority>
    <RequestedDate>{{requestedDate}}</RequestedDate>
</ServiceOrder>
```

**iFlow 2: Sync Technician Status**

```
Scheduled Receiver (S/4HANA) → Filter → Transform 
→ REST Adapter (Build Apps) → Success/Acknowledge
```

#### Bước 4.2: API Management

**API Products cần tạo:**

1. **Field Service API**
   - GET /service-orders
   - POST /service-orders
   - PUT /service-orders/{id}
   - GET /technicians

2. **Invoice API**
   - GET /invoices
   - POST /invoices
   - GET /invoices/{id}/status

**Security Configuration:**
- OAuth 2.0 client credentials
- API keys cho external partners
- Rate limiting: 1000 requests/hour

---

### Phase 5: Testing & Deployment (Tuần 15-16)

#### Bước 5.1: Test Cases

**Functional Tests:**

| Test Case | Expected Result |
|-----------|-----------------|
| Create service request | Request created, notification sent |
| Auto-assign technician | Technician assigned based on rules |
| Manager approval workflow | Approval email sent, process continues after approve |
| Check-in with GPS | Location captured and stored |
| Create invoice | Invoice created in S/4HANA |
| SLA breach detection | Escalation triggered |

**Integration Tests:**

- API endpoints response time < 2s
- Data sync between systems < 5 minutes
- Error handling và retry logic

#### Bước 5.2: Deployment Checklist

- [ ] Build apps deployed to production
- [ ] Workflows activated
- [ ] iFlows deployed và monitored
- [ ] Database backups configured
- [ ] Monitoring alerts setup
- [ ] User documentation completed
- [ ] Training sessions conducted

---

## 📈 KPIs và Metrics

### Operational Metrics

| Metric | Target |
|--------|--------|
| Average response time | < 2 hours |
| First-time fix rate | > 85% |
| SLA compliance | > 95% |
| Customer satisfaction | > 4.5/5 |
| Invoice accuracy | > 99% |

### Technical Metrics

| Metric | Target |
|--------|--------|
| App uptime | > 99.5% |
| API response time | < 500ms |
| Data sync latency | < 5 minutes |
| Error rate | < 0.1% |

---

## 🔒 Security Considerations

### Authentication & Authorization

- SAP Identity Authentication Service (IAS)
- Role-based access control (RBAC)
- Multi-factor authentication cho admins

### Data Protection

- Encryption at rest (HANA Cloud)
- Encryption in transit (TLS 1.3)
- GDPR compliance cho customer data

### API Security

- OAuth 2.0/OIDC
- API keys rotation
- Threat protection policies

---

## 📝 Lessons Learned (Template)

*Sau khi hoàn thành dự án, hãy điền vào các mục sau:*

### What Went Well
- 
- 
- 

### Challenges Faced
- 
- 
- 

### How We Overcame
- 
- 
- 

### Recommendations for Next Iteration
- 
- 
- 

---

## 🔗 Resources Cho Dự Án

| Resource | Link |
|----------|------|
| SAP Build Apps Docs | [Link](https://help.sap.com/docs/build-apps) |
| BPA Documentation | [Link](https://help.sap.com/docs/build-process-automation) |
| Integration Suite Guides | [Link](https://help.sap.com/docs/integration-suite) |
| HANA Cloud Reference | [Link](https://help.sap.com/docs/hana-cloud) |
| S/4HANA APIs | [Link](https://businessacceleratorhub.sap.com/) |

---

*Dự án này sẽ được cập nhật thường xuyên trong quá trình triển khai thực tế. Theo dõi phần [Ghi Chú](/notes/) để xem các bài học và vấn đề gặp phải.*
