-- =============================================================================
-- Print Tracking Group SKU — เพิ่มคอลัมน์ไอเทม/จำนวนชิ้น
-- ตาราง : TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
-- ใช้กับ: หน้า /report-printTrackingGroupSku (modal ระบุขนาดกล่อง)
-- =============================================================================
--
-- ทำอะไร
--   ITEM_ID          รหัสสินค้าของแถวนั้น — เอาไว้โชว์บนจอว่ากลุ่มนี้คือสินค้าตัวไหน
--                    (คนอ่านรู้เรื่อง ต่างจาก barcode ที่เป็นเลขยาว) ไม่ได้ใช้ตรวจตอนสแกน
--   ITEM_ID_BARCODE  barcode สินค้าของแถวนั้น — หน้าเว็บใช้เทียบกับที่พนักงานสแกน
--                    ก่อนเปิดให้กรอกขนาดกล่อง กันหยิบของผิดกลุ่มมาพิมพ์ทับ
--   QTY              จำนวนชิ้นของแถวนั้น (1 แถว = 1 SHIPMENT_ID = 1 order)
--
-- ทำไมไม่มีคอลัมน์ "จำนวนต่อ order" แยกอีกตัว
--   1 แถวคือ 1 order อยู่แล้ว QTY กับ "จำนวนชิ้นต่อ 1 order" จึงเป็นเลขตัวเดียวกัน
--   เก็บสองที่ = เก็บค่าซ้ำ และเสี่ยงว่าวันหนึ่งสองค่าไม่ตรงกันเพราะ job เติมมาไม่เท่ากัน
--   หน้าเว็บคำนวณเอาเองจาก QTY ตัวเดียว:
--     - ยอดรวม       = SUM(QTY) ของแถวที่จะพิมพ์
--     - ต่อ 1 order   = รวม QTY ของแถวที่ SHIPMENT_ID เดียวกันก่อน แล้วดูว่าทุก order เท่ากันไหม
--   วิธีนี้ยังถูกต้องแม้ 1 order จะมีหลาย SKU ซึ่งคอลัมน์ตายตัวจะตอบไม่ได้
--
-- ⚠ ใครเป็นคนเติมค่า
--   api.js ไม่มีคำสั่ง INSERT ลงตารางนี้เลย — แถวถูกสร้างจากระบบ/job ภายนอก
--   ต้องตามไปแก้ตัวที่ insert ให้เติม 2 คอลัมน์นี้ด้วย ไม่งั้นจะได้ NULL ทั้งคอลัมน์
--
--   ระหว่างที่ยังไม่ได้แก้ job: หน้าเว็บทำงานต่อได้ปกติ ไม่พัง —
--   ไม่มี ITEM_ID_BARCODE = ซ่อนช่องสแกนแล้วข้ามไปกรอกขนาดกล่องเลย (พฤติกรรมเดิม)
--   ไม่มี QTY            = การ์ดสรุปโชว์ 0 ชิ้น
--   พอ job เริ่มเติมข้อมูล หน้าเว็บจะบังคับสแกนเองอัตโนมัติ ไม่ต้องแก้โค้ดซ้ำ
--
-- ค่าที่ควรเติม (อ้างจาก TSDC_PICK_CHECK_NEW_TRACKING ซึ่งเป็นตารางไอเทมจริง)
--   ITEM_ID         = ITEM_ID ของไอเทมใน shipment นั้น
--   ITEM_ID_BARCODE = ITEM_ID_BARCODE ของไอเทมใน shipment นั้น
--   QTY             = SUM(QTY_PICK) ของ shipment นั้น
--   join ด้วย SHIPMENT_ID + SELLER_NO (+ TRACKING ถ้ามี)
-- =============================================================================

USE [ชื่อ DATABASE];   -- << แก้เป็นชื่อจริงก่อนรัน
GO

-- รันซ้ำได้ ไม่พังถ้าเคยเพิ่มไปแล้ว
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU')
       AND name = 'ITEM_ID'
)
BEGIN
    ALTER TABLE dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
        ADD ITEM_ID varchar(50) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU')
       AND name = 'ITEM_ID_BARCODE'
)
BEGIN
    ALTER TABLE dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
        ADD ITEM_ID_BARCODE varchar(50) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
     WHERE object_id = OBJECT_ID('dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU')
       AND name = 'QTY'
)
BEGIN
    ALTER TABLE dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU
        ADD QTY int NULL;
END
GO


-- =============================================================================
-- เติมข้อมูลย้อนหลังให้แถวที่มีอยู่แล้ว (ทางเลือก — ไว้ทดสอบหน้าจอก่อนแก้ job)
--
-- ⚠ ก่อนรันจริง ให้เปลี่ยน UPDATE เป็น SELECT ดูผลก่อนเสมอ
--   และจำกัด GROUP_PICK ที่จะทดสอบ อย่ารันทั้งตารางรวดเดียว
-- =============================================================================
/*
UPDATE g
   SET g.ITEM_ID         = i.ITEM_ID
      ,g.ITEM_ID_BARCODE = i.ITEM_ID_BARCODE
      ,g.QTY             = i.QTY
  FROM dbo.TSDC_PICK_CHECK_NEW_TRACKING_GROUP_SKU g
 CROSS APPLY (
        SELECT TOP 1
               MAX(t.ITEM_ID)         AS ITEM_ID,            -- 1 order = 1 SKU ในกลุ่ม SKU
               MAX(t.ITEM_ID_BARCODE) AS ITEM_ID_BARCODE,
               SUM(t.QTY_PICK)        AS QTY
          FROM dbo.TSDC_PICK_CHECK_NEW_TRACKING t
         WHERE t.SHIPMENT_ID = g.SHIPMENT_ID
           AND t.SELLER_NO   = g.SELLER_NO
      ) i
 WHERE LTRIM(RTRIM(g.GROUP_PICK)) = 'G-SKU002'   -- << ระบุกลุ่มที่จะทดสอบ
   AND g.QTY IS NULL;
*/
