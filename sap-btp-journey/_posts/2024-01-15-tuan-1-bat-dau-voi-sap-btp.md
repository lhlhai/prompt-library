---
layout: post
title: "Tuần 1: Bắt Đầu Với SAP BTP"
date: 2024-01-15
tags: [beginner, sap-btp, setup]
excerpt: "Ghi lại những bước đầu tiên khi làm quen với SAP BTP - từ việc tạo tài khoản trial đến những bỡ ngỡ ban đầu."
---

# Tuần 1: Bắt Đầu Với SAP BTP

## 📅 Thời Gian
**Ngày:** 15-21/01/2024  
**Status:** ✅ Hoàn thành

---

## 🎯 Mục Tiêu Tuần Này

- [x] Tìm hiểu tổng quan về SAP BTP
- [x] Tạo tài khoản SAP BTP Trial
- [x] Khám phá SAP BTP Cockpit
- [x] Kích hoạt các services cơ bản

---

## 📝 Những Gì Đã Học

### 1. SAP BTP Là Gì?

SAP Business Technology Platform (BTP) là nền tảng thống nhất cho:
- **Database & Data Management**: SAP HANA Cloud, SAP Datasphere
- **Analytics**: SAP Analytics Cloud
- **Application Development**: SAP Build Apps, ABAP Environment
- **Integration**: SAP Integration Suite, API Management

> 💡 **Bài học:** Ban đầu tôi nghĩ BTP chỉ là một service đơn lẻ, nhưng thực ra nó là một "umbrella platform" bao gồm nhiều services khác nhau.

### 2. Tạo Tài Khoản Trial

**Link:** https://account.hanatrial.ondemand.com/

**Các bước:**
1. Đăng ký với email cá nhân
2. Xác nhận email qua link SAP gửi
3. Chọn region (tôi chọn EU Frankfurt)
4. Đặt password cho Global Account

**Lưu ý quan trọng:**
- ⚠️ Email phải chưa từng đăng ký SAP nào trước đó
- ⚠️ Trial account có hạn 365 ngày
- ⚠️ Một số services không available trong trial

### 3. Làm Quen Với Cockpit

SAP BTP Cockpit là nơi quản lý tất cả services. Giao diện ban đầu khá phức tạp với nhiều khái niệm:

```
Global Account
└── Directory (optional)
    └── Subaccount
        ├── Services
        ├── Entitlements
        ├── Members
        └── Connectivity
```

**Khái niệm cần hiểu:**
- **Global Account**: Tài khoản cao nhất, đại diện cho tổ chức/cá nhân
- **Subaccount**: Nơi provision services, thường phân chia theo project/environment
- **Entitlements**: Phân quyền sử dụng services cho subaccount

### 4. Kích Hoạt Services

Các services tôi đã kích hoạt cho giai đoạn 1:

| Service | Plan | Mục Đích |
|---------|------|----------|
| SAP Build Apps | Standard | Phát triển ứng dụng low-code |
| SAP Build Process Automation | Standard | Tự động hóa workflow |
| Cloud Foundry Runtime | Free | Deploy applications |
| SAP HANA Cloud | Trial | Database |

**Cách kích hoạt:**
1. Vào Subaccount → Entitlements
2. Click "Configure Entitlements"
3. Add Service → Chọn service và plan
4. Save

---

## 🐛 Vấn Đề Gặp Phải

### Problem 1: Không thấy service trong catalog

**Mô tả:** Khi vào Entitlements → Add Service, một số services không hiển thị.

**Nguyên nhân:** 
- Service đó không available trong region đã chọn
- Service yêu cầu subscription riêng

**Giải pháp:**
- Kiểm tra region availability trên SAP Help Portal
- Với trial account, chỉ một số services nhất định available

### Problem 2: Confusion giữa Cloud Foundry và Neo

**Mô tả:** Ban đầu tôi không hiểu sự khác biệt giữa Cloud Foundry environment và Neo environment.

**Tìm hiểu được:**
- **Neo**: Legacy environment, SAP đang dần deprecated
- **Cloud Foundry**: Modern, open-source, recommended choice
- **Kyma**: Kubernetes-based, cho advanced use cases

**Quyết định:** Chọn Cloud Foundry cho tất cả projects mới.

### Problem 3: Quota confusion

**Mô tả:** Không hiểu tại sao sau khi assign entitlements vẫn không thể create instance.

**Nguyên nhân:** Entitlements chỉ là permission, cần create actual instance separately.

**Giải pháp:**
1. Vào Subaccount → Instances and Subscriptions
2. Click "Create"
3. Chọn service đã được entitled
4. Configure parameters và create

---

## 💡 Tips Cho Người Mới

1. **Đừng ngại click around:** Cockpit có nhiều thông tin, cách tốt nhất là khám phá trực tiếp.

2. **Screenshot mọi thứ:** Quá trình setup khá dài, screenshot giúp reference sau này.

3. **Đọc error messages kỹ:** SAP error messages khá chi tiết, thường chứa hint để fix.

4. **Bookmark các links quan trọng:**
   - [SAP BTP Help](https://help.sap.com/docs/btp)
   - [SAP Developers](https://developers.sap.com/)
   - [SAP Community](https://community.sap.com/)

5. **Join community:** SAP Community rất active, hầu hết questions đã được answer.

---

## 📊 Progress Check

| Nhiệm Vụ | Status | Ghi Chú |
|----------|--------|---------|
| Đọc overview SAP BTP | ✅ | Hiểu 4 pillars |
| Tạo trial account | ✅ | Mất khoảng 30 phút |
| Explore Cockpit | ✅ | Vẫn còn nhiều điều chưa hiểu |
| Activate services | ✅ | 4 services activated |
| Viết blog post | ✅ | Đang viết đây 😊 |

---

## 🎯 Kế Hoạch Tuần Sau

- [ ] Làm quen với SAP Business Application Studio
- [ ] Tạo dev space đầu tiên
- [ ] Hoàn thành tutorial "Hello World"
- [ ] Tìm hiểu về Cloud Foundry CLI

---

## 🔗 Links Hữu Ích Từ Tuần Này

- [What is SAP BTP?](https://help.sap.com/docs/btp/sap-business-technology-platform/what-is-sap-business-technology-platform)
- [Getting Started with SAP BTP Trial](https://developers.sap.com/)
- [SAP BTP Cockpit Overview](https://help.sap.com/docs/btp/sap-business-technology-platform/sap-btp-cockpit-overview)

---

*Hẹn gặp lại ở bài viết tuần sau! 🚀*
