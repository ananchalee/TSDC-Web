-- =============================================================================
-- STATUS_CLOSE_MAN — คอลัมน์ที่ Confirm_QtyGroupSku เขียนเป็น 'N' ตอนยืนยันจำนวน
-- ตาราง : TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
-- =============================================================================
--
-- ⚠ ตรวจก่อนขึ้น API — ถ้าคอลัมน์นี้ไม่มีอยู่จริง เส้น /Confirm_QtyGroupSku จะพังทั้งเส้น
--   ด้วย error "Invalid column name 'STATUS_CLOSE_MAN'" แล้วยืนยันจำนวนไม่ได้เลย
--
-- ไม่มีโค้ดตัวไหนใน api.js หรือฝั่ง Angular อ้างคอลัมน์นี้มาก่อน จึงยืนยันจากโค้ดไม่ได้
-- ว่ามีอยู่แล้วหรือยัง ต้องมาตรวจกับ DB จริง
-- =============================================================================

USE TSDC_INTERNAL;
GO

-- ── 1. มีคอลัมน์นี้อยู่แล้วหรือยัง + ชนิดข้อมูลอะไร ──────────────────
SELECT c.name          AS column_name,
       t.name          AS data_type,
       c.max_length,
       c.is_nullable
  FROM sys.columns c
  JOIN sys.types   t ON c.user_type_id = t.user_type_id
 WHERE c.object_id = OBJECT_ID('dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU')
   AND c.name = 'STATUS_CLOSE_MAN';
GO

-- ไม่ได้แถว = ยังไม่มีคอลัมน์ ให้รันข้อ 2
-- ได้แถว    = มีแล้ว ข้ามข้อ 2 ไปได้เลย แต่ดูด้วยว่าชนิดข้อมูลรับค่า 'N' ได้จริง


-- ── 2. เพิ่มคอลัมน์ (รันเฉพาะเมื่อข้อ 1 ไม่ได้แถว) ────────────────────
/*
ALTER TABLE dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
    ADD STATUS_CLOSE_MAN varchar(1) NULL;
*/
GO


-- ── 3. ดูค่าที่มีอยู่จริงในตาราง (เผื่อคอลัมน์มีอยู่แล้วและมีกติกาของมันเอง) ──
/*
SELECT STATUS_CLOSE_MAN, COUNT(*) AS rows_count
  FROM dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
 GROUP BY STATUS_CLOSE_MAN
 ORDER BY rows_count DESC;
*/
