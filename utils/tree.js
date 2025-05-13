const { MenuBtn } = require('../model/menuBtn');

/**
 * 构建菜单树
 * @param {Array} menus - 菜单项列表
 * @returns {Array} 树形结构的菜单项列表
 */
const buildMenuTree = (menus) => {
  const map = {};
  const roots = [];

  // 初始化map和根节点数组
  menus.forEach((menu) => {
    menu.children = []; // 确保每个菜单都有一个children属性
    map[menu.menuId] = menu;
  });

  // 遍历所有菜单，填充子菜单
  menus.forEach((menu) => {
    if (menu.parentId === null || menu.parentId === undefined) {
      roots.push(map[menu.menuId]);
    } else {
      const parentMenu = map[menu.parentId];
      if (parentMenu) {
        parentMenu.children.push(map[menu.menuId]);
      }
    }
  });

  return roots;
};

/**
 * 在叶子节点中添加操作按钮
 * @param {Array} tree - 树形结构的菜单项列表
 * @returns {Promise<Array>} 带有操作按钮的树形结构的菜单项列表
 */
const addButtonsToLeafNodes = async (tree) => {
  const processNode = async (node) => {
    if (node.children.length === 0) {
      delete node.children; // 删除叶子节点的 children 属性

      // 查询并添加操作按钮
      const actions = await MenuBtn.find({ menuId: node.menuId });
      node.actions = actions.map((item) => ({
        btnId: item.btnId,
        btnName: item.btnName,
        btnCode: item.btnCode,
        btnUrl: item.btnUrl,
        btnSeqId: item.btnSeqId,
        requestMethod: item.requestMethod,
      }));
    } else {
      // 递归处理子节点
      for (let i = 0; i < node.children.length; i++) {
        await processNode(node.children[i]);
      }
    }
  };

  // 对每个根节点进行处理
  for (let i = 0; i < tree.length; i++) {
    await processNode(tree[i]);
  }

  return tree;
};

module.exports = {
  buildMenuTree,
  addButtonsToLeafNodes,
};
