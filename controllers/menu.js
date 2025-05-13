const mongoose = require('mongoose');
const { Menu } = require('../model/menu');
const { MenuBtn } = require('../model/menuBtn');
const { getNextSequenceValue } = require('../utils/sequence');
const { buildMenuTree, addButtonsToLeafNodes } = require('../utils/tree');

// 递归处理菜单数据并保存到数据库
async function processMenuData(menuData, parentId = null) {
  for (let menuItem of menuData) {
    try {
      // 获取下一个自增的 menuId
      menuItem.menuId = await getNextSequenceValue('menuId');

      // 设置 parentId 为父菜单的 menuId
      menuItem.parentId = parentId;

      // 如果有子菜单，则递归处理
      if (menuItem.children && Array.isArray(menuItem.children)) {
        await processMenuData(menuItem.children, menuItem.menuId); // 使用当前菜单的 menuId 作为子菜单的 parentId
      }

      // 删除 children 字段，因为它不在 Schema 定义中
      delete menuItem.children;

      // 处理 actions（如果存在）
      if (menuItem.actions && Array.isArray(menuItem.actions)) {
        await processActions(
          menuItem.actions,
          menuItem.menuId,
          menuItem.menuName
        );
        delete menuItem.actions; // 如果不需要在最终菜单对象中保留 actions
      }

      // 查找是否存在相同 menuCode 的记录
      const existingMenu = await Menu.findOne({ menuCode: menuItem.menuCode });

      if (existingMenu) {
        // 更新现有记录
        existingMenu.set(menuItem);
        await existingMenu.save();
        console.log(
          `Menu item updated successfully: ${menuItem.menuName} with menuId: ${menuItem.menuId}`
        );
      } else {
        // 创建新记录
        const newMenu = new Menu(menuItem);
        await newMenu.save();
        console.log(
          `Menu item saved successfully: ${menuItem.menuName} with menuId: ${menuItem.menuId}`
        );
      }
    } catch (error) {
      console.error(`Error processing or saving menu item:`, error.message);
      throw error; // 抛出错误以便上层可以捕获
    }
  }
}

// 处理按钮数据并保存到数据库
async function processActions(actions, menuId, menuName) {
  for (let action of actions) {
    try {
      // 获取下一个自增的 btnId (与 menuId 独立)
      action.btnId = await getNextSequenceValue('btnId'); // 使用独立的递增ID

      // 设置 menuId 和 menuName
      action.menuId = menuId;
      action.menuName = menuName;

      // 查找是否存在相同 btnCode 的记录
      const existingButton = await MenuBtn.findOne({ btnCode: action.btnCode });

      if (existingButton) {
        // 更新现有记录
        existingButton.set(action);
        await existingButton.save();
        console.log(
          `Button updated successfully: ${action.btnName} with btnId: ${action.btnId}`
        );
      } else {
        // 创建新记录
        const newButton = new MenuBtn(action);
        await newButton.save();
        console.log(
          `Button saved successfully: ${action.btnName} with btnId: ${action.btnId}`
        );
      }
    } catch (error) {
      console.error(`Error processing or saving button item:`, error.message);
      throw error; // 抛出错误以便上层可以捕获
    }
  }
}

// 辅助函数：递归收集所有 menuCode
function collectMenuCodes(menuData, collectedCodes = new Set()) {
  for (let menuItem of menuData) {
    if (menuItem.menuCode) {
      collectedCodes.add(menuItem.menuCode);
    }

    if (menuItem.children && Array.isArray(menuItem.children)) {
      collectMenuCodes(menuItem.children, collectedCodes);
    }

    if (menuItem.actions && Array.isArray(menuItem.actions)) {
      const buttonCodes = collectButtonCodes(menuItem.actions);
      for (let btnCode of buttonCodes) {
        collectedCodes.add(btnCode);
      }
    }
  }

  return collectedCodes;
}

// 辅助函数：递归收集所有 btnCode
function collectButtonCodes(actions, collectedCodes = new Set()) {
  for (let action of actions) {
    if (action.btnCode) {
      collectedCodes.add(action.btnCode);
    }
  }

  return collectedCodes;
}

// 辅助函数：递归收集所有 actions
function collectAllActions(menuData) {
  let allActions = [];

  for (let menuItem of menuData) {
    if (menuItem.actions && Array.isArray(menuItem.actions)) {
      allActions.push(...menuItem.actions);
    }

    if (menuItem.children && Array.isArray(menuItem.children)) {
      allActions.push(...collectAllActions(menuItem.children));
    }
  }

  return allActions;
}

const init = async (ctx) => {
  const body = ctx.request.body;
  console.log('初始化::=======', JSON.stringify(body, null, 2)); // 打印接收的数据结构便于调试

  try {
    // 获取传入的所有 menuCode 和 btnCode
    const incomingMenuCodes = collectMenuCodes([body]);
    const incomingButtonCodes = collectButtonCodes(collectAllActions([body]));

    // 日志记录传入的菜单和按钮数据
    console.log('Incoming menuCodes:', [...incomingMenuCodes]);
    console.log('Incoming buttonCodes:', [...incomingButtonCodes]);

    // 获取数据库中所有的 btnCode
    const dbButtons = await MenuBtn.find({}, { btnCode: 1, _id: 0 });
    const dbButtonCodes = new Set(dbButtons.map((button) => button.btnCode));

    // 日志记录数据库中的按钮数据
    console.log('Database buttonCodes:', [...dbButtonCodes]);

    // 获取数据库中所有的 menuCode
    const dbMenus = await Menu.find({}, { menuCode: 1, _id: 0 });
    const dbMenuCodes = new Set(dbMenus.map((menu) => menu.menuCode));

    // 日志记录数据库中的菜单数据
    console.log('Database menuCodes:', [...dbMenuCodes]);

    // 检查数据库中存在的 menuCode 是否在传入的数据中缺失
    const missingMenuCodes = [...dbMenuCodes].filter(
      (code) => !incomingMenuCodes.has(code)
    );

    if (missingMenuCodes.length > 0) {
      ctx.body = {
        status: 400,
        msg: '缺少以下 menuCode 数据',
        missingMenuCodes,
      };
      return; // 结束处理
    }

    // 检查数据库中存在的 btnCode 是否在传入的数据中缺失
    const missingButtonCodes = [...dbButtonCodes].filter(
      (code) => !incomingButtonCodes.has(code)
    );

    if (missingButtonCodes.length > 0) {
      ctx.body = {
        status: 400,
        msg: '缺少以下 btnCode 数据',
        missingButtonCodes,
      };
      return; // 结束处理
    }

    // 递归处理所有菜单数据
    await processMenuData([body]);

    ctx.body = {
      status: 200,
      msg: '初始化成功',
    };
  } catch (error) {
    console.error('Initialization failed:', error.message);
    ctx.body = {
      status: 500,
      msg: '初始化失败',
      error: error.message, // 更改 mgs 为 msg 并输出错误信息
    };
  }
};

const query = async (ctx) => {
  try {
    const allMenus = await Menu.find();

    // 过滤出需要的字段
    const filteredMenus = allMenus.map((menu) => ({
      menuId: menu.menuId,
      menuCode: menu.menuCode,
      parentId: menu.parentId,
      menuName: menu.menuName,
      menuSeqId: menu.menuSeqId,
      menuIcon: menu.menuIcon,
      menuUrl: menu.menuUrl,
    }));

    // 构建菜单树
    let treeData = buildMenuTree(filteredMenus);
    // 在叶子节点中添加操作按钮
    treeData = await addButtonsToLeafNodes(treeData);
    console.log('treeData::', treeData);

    ctx.body = {
      status: 200,
      msg: '查询成功',
      data: treeData,
    };
  } catch (err) {
    console.error('Error occurred:', err);
    ctx.status = err.status || 500; // 更改默认状态码为500，表示服务器内部错误
    ctx.body = {
      status: ctx.status,
      msg: err.message || '查询失败',
    };
  }
};

module.exports = {
  init,
  query,
};
