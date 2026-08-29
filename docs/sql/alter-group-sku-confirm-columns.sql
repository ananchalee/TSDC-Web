-- =============================================================================
-- Confirm จำนวนชิ้นตอนเบิกของ — เพิ่มคอลัมน์บันทึกการยืนยัน
-- ตาราง : TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
-- ใช้กับ: หน้า /confirm-qty-groupsku
-- =============================================================================
--
-- ทำอะไร
--   USER_CONFIRM   PIN CODE ของคนที่กดยืนยัน (เก็บ pincode ตรงๆ เหมือน USER_CHECK ของ audit check)
--   CONFIRM_DATE   วันเวลาที่กดยืนยัน — ใช้เวลาของ DB (GETDATE()) ไม่ใช่นาฬิกาเครื่อง client
--
-- ยืนยัน 1 ครั้ง = เขียนลง **ทุกแถวของ GROUP_PICK นั้น** เพราะตอนเบิกของยังไม่ได้แยกขนส่ง
-- คนเบิกนับของทั้งกลุ่มรวดเดียว
--
-- CONFIRM_DATE IS NULL = ยังไม่ยืนยัน — ใช้เป็นตัวกันยืนยันซ้ำด้วย
-- (API update เฉพาะแถวที่ยังเป็น NULL ถ้าไม่โดนสักแถวแปลว่ามีคนยืนยันไปก่อนแล้ว)
-- =============================================================================

USE [ชื่อ DATABASE];   -- << แก้เป็นชื่อจริงก่อนรัน
GO

-- รันซ้ำได้ ไม่พังถ้าเคยเพิ่มไปแล้ว
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU')
       AND name = 'USER_CONFIRM'
)
BEGIN
    ALTER TABLE dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
        ADD USER_CONFIRM varchar(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU')
       AND name = 'CONFIRM_DATE'
)
BEGIN
    ALTER TABLE dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
        ADD CONFIRM_DATE datetime NULL;
END
GO


-- =============================================================================
-- ล้างสถานะยืนยันของกลุ่มหนึ่ง (ไว้ทดสอบซ้ำ / แก้เคสยืนยันผิดกลุ่ม)
--
-- หน้าเว็บยืนยันซ้ำไม่ได้โดยตั้งใจ ถ้าต้องแก้จริงๆ ให้ล้างด้วยคำสั่งนี้แล้วให้ยืนยันใหม่
-- =============================================================================
/*
UPDATE dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
   SET USER_CONFIRM = NULL
      ,CONFIRM_DATE = NULL
 WHERE LTRIM(RTRIM(GROUP_PICK)) = 'G-SKU002';   -- << ระบุกลุ่ม
*/
