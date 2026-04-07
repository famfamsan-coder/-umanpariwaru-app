import { initializeDatabase, getDb } from './db';
import { hashPassword } from './auth';

const ROLE_TEMPLATES = [
  {
    position: 1,
    manual: `[Floor Staff Manual]

The floor staff's primary mission is to create a comfortable environment for guests.

■ Basic Attitude
- Always greet guests with a smile ("Welcome!" / "Thank you very much!")
- Continuously check table conditions and clear/clean promptly
- Respond to guest calls within 5 seconds

■ Handling Busy Periods
- When a waiting list forms, inform guests of accurate wait times
- Coordinate closely with the kitchen to manage dish delivery timing

■ Handling Issues
- Listen to complaints on the spot and report immediately to the manager. Never try to resolve alone.`,
    responsibility: `Manages overall floor operations.\nMain duties are maintaining/improving service quality and optimizing table turnover.\nDuring peak hours, leads coordination with kitchen and register to ensure smooth store operation.`,
    checklist: [
      'Check uniform and personal appearance',
      'Clean floor and wipe down tables',
      'Check table setup (chopsticks/utensils, condiments, menus)',
      'Log in to POS system',
      'Review today\'s reservations and expected busyness',
    ],
    tasks: [
      'Fill in daily report (floor status)',
      'Check and restock supplies (wet towels, napkins, etc.)',
      'Disinfect and wipe table surfaces',
      'Empty trash and replace trash bags',
      'Prepare table setup for the next day',
    ],
  },
  {
    position: 2,
    manual: `[Register & Customer Service Manual]

This position requires accurate payment processing and courteous service.

■ Register Basics
- Verify change before opening (bills: 10,000 / 5,000 / 1,000 yen, and all coins)
- Always confirm the amount aloud before handing back change
- Report any credit/e-money operation errors immediately to the manager

■ Service Flow
1. When a guest approaches the register, greet with a smile: "Ready to pay?"
2. Check the receipt and read out the total amount
3. Confirm payment method
4. Ask if a receipt is needed

■ End-of-Day Closing
- After closing, verify the daily summary matches the cash on hand
- Record any discrepancies and report to the manager`,
    responsibility: `Handles all register operations and primary front-of-house customer service.\nAccurate cash management and electronic payment processing are the top priorities.\nAlso actively contributes to improving guest satisfaction at checkout.`,
    checklist: [
      'Check and replenish change (all denominations)',
      'Check receipt roll remaining',
      'Start up and verify communication on payment terminal',
      'Clean register counter',
      'Check expiry dates on discount vouchers and coupons',
    ],
    tasks: [
      'Reconcile and record daily sales report',
      'Verify cash in register',
      'Check receipt paper stock',
      'Run daily closing process on credit terminal',
      'Move cash to safe (when over threshold)',
    ],
  },
  {
    position: 3,
    manual: `[Back-of-House Management Manual]

Handles inventory management, ordering, and maintaining the back-of-house environment.

■ Receiving Deliveries
- Always verify deliveries against the invoice (quantity, item code, expiry date)
- Refrigerated/frozen items must be stored in the fridge/freezer within 10 minutes of arrival
- Strictly follow FIFO (first in, first out) — move older stock to the front

■ Storage Environment
- Refrigerator: 3–5°C / Freezer: -18°C or below
- Record temperatures twice a day (before opening and before closing)
- Store allergens in a designated area

■ Disposal
- Record all expired or degraded items on the disposal list before discarding`,
    responsibility: `Responsible for overall hygiene and safety management of the back-of-house.\nMain duties are reducing food waste through proper inventory control and improving order accuracy.\nMust always operate in compliance with food safety standards (HACCP).`,
    checklist: [
      'Record refrigerator and freezer temperatures',
      'Organize storage shelves and verify FIFO',
      'Confirm today\'s expected deliveries',
      'Clean back-of-house floor',
      'List items due for disposal',
    ],
    tasks: [
      'Count and record inventory quantities',
      'Check expiry dates (items within 3 days)',
      'Create and review order list',
      'Sort and take out trash',
      'Disinfect and wipe down refrigerator and shelves',
    ],
  },
  {
    position: 4,
    manual: `[Inventory & Ordering Management Manual]

This position aims to maintain optimal stock levels and eliminate both stockouts and excess inventory.

■ Inventory Check Timing
- Perform inventory check every morning before opening
- Record actual counts in the inventory management app (or spreadsheet)
- If there are large discrepancies vs. the previous day, investigate the cause

■ Ordering Rules
- Place orders the same day stock falls below the reorder level
- Calculate order quantity as: "Target stock - Current stock + Safety stock"
- Report to manager in advance when emergency ordering is needed

■ Supplier Coordination
- Know each supplier's order deadline (see separate sheet)
- Contact the supplier rep the same day for complaints (quality issues, short deliveries)`,
    responsibility: `Primary responsibility for inventory management and ordering of all ingredients and consumables.\nMain duty is preventing both stockout losses and disposal losses from excess inventory.\nAlso contributes to building good relationships with suppliers.`,
    checklist: [
      'Check inventory quantities for all categories',
      'List items below reorder level',
      'Confirm and send today\'s purchase orders',
      'Confirm delivery of yesterday\'s orders',
      'Update inventory management sheet',
    ],
    tasks: [
      'Investigate and record inventory discrepancies',
      'Tally disposal loss amounts',
      'Update monthly order performance report',
      'Check and share supplier communications',
      'Review inventory settings for new and seasonal items',
    ],
  },
  {
    position: 5,
    manual: `[Opening / Closing & Cleaning Manual]

Responsible for the "start" and "end" of store operations.

■ Opening Checklist
- Unlock the store and deactivate security
- Confirm all lights, air conditioning, and equipment are on
- Set up exterior signs and flags
- Check any special notes for the day (events, closure info, etc.)

■ Closing Procedure
- Confirm all guests have left (floor and restrooms)
- Confirm register closing is complete (handed over by register staff)
- Confirm all equipment and lights are off
- Lock up and set security

■ Cleaning Standards
- Daily cleaning (every day): floor, restrooms, entrance
- Weekly cleaning (scheduled days): exhaust fans, glass surfaces, AC filters`,
    responsibility: `Handles store opening/closing operations and manages daily and weekly cleaning.\nMain duties are equipment checks for safe store operation and maintaining a clean environment.\nAs the first and last staff member on each shift, serves as the key link for handover.`,
    checklist: [
      'Confirm start/stop of all equipment (lights, AC, POS)',
      'Set up exterior signs and tidy entrance area',
      'Clean restrooms and restock supplies',
      'Clean floor (mop)',
      'Confirm security lock/unlock',
    ],
    tasks: [
      'Record on opening/closing checklist',
      'Check for equipment issues and report',
      'Check progress on weekly cleaning schedule',
      'Take out trash on collection days',
      'Record handover notes for next shift',
    ],
  },
];

async function seed() {
  await initializeDatabase();
  const db = getDb();

  // ── Stores & Roles ──
  const storeCount = (await db.execute('SELECT COUNT(*) as count FROM stores')).rows[0]?.count as number;
  if (Number(storeCount) === 0) {
    const storeIds: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const r = await db.execute({ sql: 'INSERT INTO stores (name, sort_order) VALUES (?, ?)', args: [`Store ${i}`, i] });
      storeIds.push(Number(r.lastInsertRowid));
    }
    for (const storeId of storeIds) {
      for (let i = 0; i < 5; i++) {
        await db.execute({ sql: 'INSERT INTO roles (store_id, name, sort_order) VALUES (?, ?, ?)', args: [storeId, `Role ${i + 1}`, i + 1] });
      }
    }
    console.log('✅ Stores & roles seeded');
  } else {
    console.log('⏭️  Store data already exists, skipping');
  }

  // ── Role Content ──
  const checklistCount = (await db.execute('SELECT COUNT(*) as count FROM role_checklist_items')).rows[0]?.count as number;
  if (Number(checklistCount) === 0) {
    const roles = await db.execute('SELECT id, sort_order FROM roles ORDER BY sort_order');
    for (const role of roles.rows) {
      const tmpl = ROLE_TEMPLATES[(role.sort_order as number) - 1];
      if (!tmpl) continue;

      await db.execute({
        sql: 'UPDATE roles SET manual_content = ?, responsibility_content = ? WHERE id = ?',
        args: [tmpl.manual, tmpl.responsibility, role.id as number],
      });

      for (let i = 0; i < tmpl.checklist.length; i++) {
        await db.execute({
          sql: 'INSERT INTO role_checklist_items (role_id, title, sort_order) VALUES (?, ?, ?)',
          args: [role.id as number, tmpl.checklist[i], i + 1],
        });
      }
      for (let i = 0; i < tmpl.tasks.length; i++) {
        await db.execute({
          sql: 'INSERT INTO role_task_items (role_id, title, sort_order) VALUES (?, ?, ?)',
          args: [role.id as number, tmpl.tasks[i], i + 1],
        });
      }
    }
    console.log('✅ Role content seeded (manuals, checklists, tasks)');
  } else {
    console.log('⏭️  Role content already exists, skipping');
  }

  // ── Routine Items ──
  const routineCount = (await db.execute('SELECT COUNT(*) as count FROM routine_items')).rows[0]?.count as number;
  if (Number(routineCount) === 0) {
    const ROUTINE_TEMPLATES = [
      {
        position: 1,
        morning: [
          'Check uniform and personal appearance',
          'Clean floor and wipe down tables',
          'Check table setup (utensils, condiments, menus)',
          'Clean and tidy entrance and exterior',
          'Adjust background music and lighting',
          'Confirm POS terminal startup',
          'Check blackboard and POP content',
          'Review today\'s reservations and seating',
          'Replace trash bin liners',
          'Attend morning briefing and review handover notes',
        ],
        evening: [
          'Clean all tables and chairs',
          'Mop the floor',
          'Check and restock condiments and supplies',
          'Consolidate, sort, and take out trash',
          'Confirm POS terminal logout',
          'Confirm lights and music are off',
          'Confirm all seats are empty (no remaining guests)',
          'Check tomorrow\'s reservations and special notes',
          'Fill in daily report (floor status)',
          'Confirm entrance is locked',
        ],
      },
      {
        position: 2,
        morning: [
          'Check and replenish change',
          'Check receipt roll remaining',
          'Start up and verify payment terminal communication',
          'Clean register counter',
          'Check coupon and discount expiry dates',
          'Start POS and begin daily process',
          'Restock register area supplies (bags, receipts)',
          'Confirm today\'s campaign details',
          'Review previous day\'s report',
          'Record change breakdown',
        ],
        evening: [
          'Close register (verify daily totals)',
          'Reconcile and record cash',
          'Record and report any discrepancies',
          'Run daily closing on credit terminal',
          'Check receipt roll stock',
          'Turn off payment terminal',
          'Move cash to safe',
          'Prepare change for next day',
          'Fill in sales daily report',
          'Clean and tidy register area',
        ],
      },
      {
        position: 3,
        morning: [
          'Record refrigerator temperature (verify 3–5°C)',
          'Record freezer temperature (verify -18°C or below)',
          'Confirm today\'s expected deliveries',
          'Clean and organize back-of-house',
          'Check items expiring within 3 days',
          'List items due for disposal',
          'Verify FIFO on storage shelves',
          'Check allergen storage',
          'Check cleaning supply stock',
          'Review hygiene checklist',
        ],
        evening: [
          'Record refrigerator temperature (before closing)',
          'Store deliveries and update log',
          'Process and record disposal items',
          'Clean and disinfect back-of-house floor',
          'Final check on order list',
          'Update inventory count',
          'Prepare next day\'s delivery confirmation sheet',
          'Sort and bag trash',
          'Check for equipment or appliance issues',
          'Fill in today\'s hygiene log',
        ],
      },
      {
        position: 4,
        morning: [
          'Check inventory quantities for all categories',
          'List items below reorder level',
          'Confirm and send today\'s purchase orders',
          'Confirm delivery of yesterday\'s orders',
          'Update inventory management sheet',
          'Check and respond to stockout risks',
          'Check communications from suppliers',
          'Review inventory settings for seasonal/sale items',
          'Check expiry date management',
          'Compare today\'s order costs vs. previous day',
        ],
        evening: [
          'Enter today\'s received stock into inventory',
          'Check for pending or undelivered orders',
          'Tally and record disposal losses',
          'Create tomorrow\'s order list',
          'Handle supplier inquiries',
          'Investigate inventory discrepancies',
          'Update monthly order performance',
          'Back up inventory management sheet',
          'Review next week\'s order plan',
          'Fill in inventory daily report',
        ],
      },
      {
        position: 5,
        morning: [
          'Unlock store and deactivate security',
          'Confirm all lights are on',
          'Start up air conditioning and ventilation',
          'Set up exterior signs and flags',
          'Clean restrooms and restock supplies',
          'Clean entrance and glass doors',
          'Check parking lot and surrounding area',
          'Review today\'s shift and special notes',
          'Check for equipment issues',
          'Record on opening checklist',
        ],
        evening: [
          'Confirm all guests have left',
          'Confirm all lights are off',
          'Confirm air conditioning and ventilation are off',
          'Final restroom check and lock',
          'Take down exterior signs and flags',
          'Check trash collection day and take out trash',
          'Final check for equipment issues',
          'Set security and confirm locks',
          'Record handover notes for next shift',
          'Record on closing checklist',
        ],
      },
    ];

    const stores = await db.execute('SELECT id FROM stores ORDER BY sort_order');
    for (const store of stores.rows) {
      const roles = await db.execute({ sql: 'SELECT id, sort_order FROM roles WHERE store_id = ? ORDER BY sort_order', args: [store.id as number] });
      for (const role of roles.rows) {
        const tmpl = ROUTINE_TEMPLATES[(role.sort_order as number) - 1];
        if (!tmpl) continue;
        for (let i = 0; i < tmpl.morning.length; i++) {
          await db.execute({ sql: 'INSERT INTO routine_items (store_id, role_id, title, period, sort_order) VALUES (?, ?, ?, ?, ?)', args: [store.id as number, role.id as number, tmpl.morning[i], 'morning', i + 1] });
        }
        for (let i = 0; i < tmpl.evening.length; i++) {
          await db.execute({ sql: 'INSERT INTO routine_items (store_id, role_id, title, period, sort_order) VALUES (?, ?, ?, ?, ?)', args: [store.id as number, role.id as number, tmpl.evening[i], 'evening', i + 1] });
        }
      }
    }
    console.log('✅ Routine items seeded (10 morning + 10 evening per role)');
  } else {
    console.log('⏭️  Routine items already exist, skipping');
  }

  // ── Suppliers & Ingredients ──
  const supplierCount = (await db.execute('SELECT COUNT(*) as count FROM suppliers')).rows[0]?.count as number;
  if (Number(supplierCount) === 0) {
    const SUPPLIER_TEMPLATES = [
      {
        name: 'Prime Meats Co.',
        sort_order: 1,
        ingredients: [
          { name: 'Chicken thigh', unit: 'kg' },
          { name: 'Chicken breast', unit: 'kg' },
          { name: 'Pork belly', unit: 'kg' },
          { name: 'Pork loin', unit: 'kg' },
          { name: 'Beef offcuts', unit: 'kg' },
          { name: 'Mixed ground meat', unit: 'kg' },
          { name: 'Ground chicken', unit: 'kg' },
          { name: 'Bacon', unit: 'kg' },
          { name: 'Sausage', unit: 'pcs' },
          { name: 'Chicken drumettes', unit: 'kg' },
          { name: 'Pork scraps', unit: 'kg' },
          { name: 'Thinly sliced beef short rib', unit: 'kg' },
          { name: 'Chicken liver', unit: 'kg' },
          { name: 'Ground pork', unit: 'kg' },
          { name: 'Chicken skin', unit: 'kg' },
          { name: 'Beef tongue', unit: 'kg' },
          { name: 'Pork spare ribs', unit: 'kg' },
          { name: 'Chicken carcass', unit: 'kg' },
          { name: 'Pig feet', unit: 'pcs' },
          { name: 'Chicken tenderloin', unit: 'kg' },
        ],
      },
      {
        name: 'Fresh Produce Ltd.',
        sort_order: 2,
        ingredients: [
          { name: 'Cabbage', unit: 'kg' },
          { name: 'Bean sprouts', unit: 'kg' },
          { name: 'Onion', unit: 'kg' },
          { name: 'Potato', unit: 'kg' },
          { name: 'Carrot', unit: 'kg' },
          { name: 'Spinach', unit: 'kg' },
          { name: 'Lettuce', unit: 'head' },
          { name: 'Cucumber', unit: 'pcs' },
          { name: 'Tomato', unit: 'kg' },
          { name: 'Eggplant', unit: 'pcs' },
          { name: 'Green pepper', unit: 'kg' },
          { name: 'Shimeji mushroom', unit: 'pack' },
          { name: 'Enoki mushroom', unit: 'bag' },
          { name: 'Rice', unit: 'kg' },
          { name: 'Flour', unit: 'kg' },
          { name: 'Sugar', unit: 'kg' },
          { name: 'Salt', unit: 'kg' },
          { name: 'Soy sauce', unit: 'L' },
          { name: 'Vegetable oil', unit: 'L' },
          { name: 'Mirin', unit: 'L' },
        ],
      },
    ];

    const stores = await db.execute('SELECT id FROM stores ORDER BY sort_order');
    for (const store of stores.rows) {
      for (const tmpl of SUPPLIER_TEMPLATES) {
        const sr = await db.execute({ sql: 'INSERT INTO suppliers (store_id, name, sort_order) VALUES (?, ?, ?)', args: [store.id as number, tmpl.name, tmpl.sort_order] });
        const supplierId = Number(sr.lastInsertRowid);
        for (let i = 0; i < tmpl.ingredients.length; i++) {
          const ing = tmpl.ingredients[i];
          await db.execute({ sql: 'INSERT INTO ingredients (supplier_id, name, unit, sort_order) VALUES (?, ?, ?, ?)', args: [supplierId, ing.name, ing.unit, i + 1] });
        }
      }
    }
    console.log('✅ Suppliers & ingredients seeded (Prime Meats / Fresh Produce, 20 items each x 3 stores)');
  } else {
    console.log('⏭️  Supplier data already exists, skipping');
  }

  // ── Cleaning Spots & Schedule ──
  const cleaningCount = (await db.execute('SELECT COUNT(*) as count FROM cleaning_spots')).rows[0]?.count as number;
  if (Number(cleaningCount) === 0) {
    const CLEANING_TEMPLATES = [
      { position: 1, spots: ['Dining room floor', 'Tables and chairs', 'Windows and glass surfaces', 'Entrance door', 'Counter area', 'Shelves and display space', 'Light fixtures', 'Walls and baseboards', 'AC filters', 'Exhaust fan'] },
      { position: 2, spots: ['Register counter', 'Payment terminal and POS monitor', 'Under-counter storage', 'Waiting area', 'Menu stands', 'Umbrella stand area', 'Entrance mat (inside)', 'Restroom entrance area', 'Chair legs', 'Drink bar area'] },
      { position: 3, spots: ['Back-of-house floor', 'Refrigerator interior', 'Freezer interior', 'Prep and work surfaces', 'Dish cabinet', 'Exhaust hood', 'Trash area', 'Food storage shelves', 'Commercial dishwasher', 'Floor drain'] },
      { position: 4, spots: ['Inventory shelves', 'Dry storage area', 'Carts and delivery tools', 'Measuring equipment', 'Storage room door and handles', 'Receiving area', 'Commercial refrigerator (exterior)', 'Digital scale', 'Office space', 'Order document storage'] },
      { position: 5, spots: ['Parking lot and perimeter', 'Exterior signs', 'Security camera area', 'Entrance mat (outside)', 'Exterior glass doors', 'Outdoor trash area', 'Electrical panel area', 'Staff entrance', 'Outdoor drain', 'Bicycle parking'] },
    ];

    // Schedule patterns: spotIdx 0-2=weekly, 3-6=biweekly, 7-9=monthly (April 2026)
    const WEEKLY  = [1,5,8,12,15,19,22,26,29]; // roughly every 4 days
    const BIWEEKLY = [3,10,17,24];
    const MONTHLY  = [7,21];

    const stores = await db.execute('SELECT id FROM stores ORDER BY sort_order');
    for (const store of stores.rows) {
      const roles = await db.execute({ sql: 'SELECT id, sort_order FROM roles WHERE store_id = ? ORDER BY sort_order', args: [store.id as number] });
      for (const role of roles.rows) {
        const tmpl = CLEANING_TEMPLATES[(role.sort_order as number) - 1];
        if (!tmpl) continue;

        for (let si = 0; si < tmpl.spots.length; si++) {
          const sr = await db.execute({
            sql: 'INSERT INTO cleaning_spots (store_id, role_id, name, sort_order) VALUES (?, ?, ?, ?)',
            args: [store.id as number, role.id as number, tmpl.spots[si], si + 1],
          });
          const spotId = Number(sr.lastInsertRowid);

          // Create April 2026 schedule entries
          const pattern = si <= 2 ? WEEKLY : si <= 6 ? BIWEEKLY : MONTHLY;
          for (const day of pattern) {
            const date = `2026-04-${String(day).padStart(2, '0')}`;
            // Past dates (before 2026-04-06) → completed or incomplete
            let status: string;
            if (day < 6) {
              status = (si % 4 === 3) ? 'incomplete' : 'completed';
            } else {
              status = 'scheduled';
            }
            await db.execute({
              sql: 'INSERT INTO cleaning_schedule (cleaning_spot_id, date, status) VALUES (?, ?, ?)',
              args: [spotId, date, status],
            });
          }
        }
      }
    }
    console.log('✅ Cleaning spots & schedule seeded (10 spots per role x April schedule)');
  } else {
    console.log('⏭️  Cleaning data already exists, skipping');
  }

  // ── Users ──
  await db.execute('DELETE FROM users');
  await db.execute({ sql: 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', args: ['admin', await hashPassword('admin123'), 'admin'] });
  await db.execute({ sql: 'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', args: ['staff', await hashPassword('staff123'), 'staff'] });
  console.log('✅ Users seeded → admin/admin123, staff/staff123');
}

seed().catch(console.error);
