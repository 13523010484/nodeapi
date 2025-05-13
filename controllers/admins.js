const models = require('../model/index');
const { Admins } = models;

// 创建学生信息
const add = async (ctx) => {
  const body = ctx.request.body;
  const newUser = new Admins(body);
  await newUser
    .save()
    .then((res) => {
      console.log('User saved', res);
      ctx.body = {
        code: 200,
        msg: '保存成功',
      };
    })
    .catch((err) => {
      console.error('Error saving user:', err);
      ctx.body = {
        code: 500,
        msg: '保存失败',
        err,
      };
    });
};

// 查询学生信息
const query = async (ctx) => {
  const { name, pageSize, pageNum } = ctx.query;
  await Admins.find({ ...(name && { name }) })
    .limit(pageSize)
    .skip(pageSize * (pageNum - 1))
    .then((res) => {
      ctx.body = {
        code: 200,
        msg: '查询成功',
        list: res,
      };
    })
    .catch((err) => {
      ctx.body = {
        code: 500,
        msg: '查询失败',
        err,
      };
    });
};

// 修改学生信息
const update = async (ctx) => {
  const { _id, name, email, gender, phone } = ctx.request.body;
  // update table set name='张三',email='dd@qq.com',password='12' where id = id
  await Admins.findOneAndUpdate(
    {
      _id, // 相当于 where 条件
    },
    {
      name, // 相当于 set 后面的
      email,
      gender,
      phone,
    }
  )
    .then((res) => {
      console.log('更新::', res);
      if (res) {
        ctx.body = {
          code: 200,
          msg: '修改成功',
        };
      } else {
        ctx.body = {
          code: 202,
          msg: '修改失败',
        };
      }
    })
    .catch((error) => {
      console.log('error::', error);
      ctx.body = {
        code: 500,
        msg: '修改失败',
        err,
      };
    });
};

// 删除学生信息
const remove = async (ctx) => {
  const { _id } = ctx.request.body;
  await Admins.findOneAndDelete({ _id })
    .then((res) => {
      console.log('res::', res);
      if (res) {
        ctx.body = {
          code: 200,
          msg: '删除成功',
        };
      } else {
        ctx.body = {
          code: 500,
          msg: '删除失败',
        };
      }
    })
    .catch((err) => {
      console.log('err::', err);
      ctx.body = {
        code: 500,
        msg: '删除失败',
      };
    });
};

module.exports = {
  add,
  query,
  update,
  remove,
};
