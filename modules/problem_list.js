let List = syzoj.model('problem-list');
let Problem = syzoj.model('problem');
let User = syzoj.model('user');

const yaml = require('js-yaml');

function sortTagList(tags) {
  const order = syzoj.config.problem_tag_colors;
  tags.sort((a, b) => {
    let x = order.indexOf(a.color);
    let y = order.indexOf(b.color);
    if (x === -1) x = order.length;
    if (y === -1) y = order.length;
    if (x < y) return -1;
    if (x > y) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

app.get('/lists', async (req, res) => {
  try {
    let query = List.createQueryBuilder();
    if (!res.locals.user || !await res.locals.user.hasPrivilege('manage_problem')) {
      if (res.locals.user) {
        query.where('is_public = 1')
             .orWhere('owner_id = :owner_id', { owner_id: res.locals.user.id });
      } else {
        query.where('is_public = 1');
      }
    }
    let paginate = syzoj.utils.paginate(await List.countForPagination(query), req.query.page, syzoj.config.page.list);
    let lists = await List.queryPage(paginate, query);

    await lists.forEachAsync(async list => {
      list.owner = await User.findById(list.owner_id);
    });

    res.render('problem_lists', {
      lists: lists,
      paginate: paginate,
      allowCreateList: res.locals.user && await res.locals.user.hasPrivilege('manage_problem')
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/lists/search', async (req, res) => {
  try {
    let id = parseInt(req.query.keyword) || 0;

    let query = List.createQueryBuilder();
    if (!res.locals.user || !await res.locals.user.hasPrivilege('manage_problem')) {
      if (res.locals.user) {
        query.where(new TypeORM.Brackets(qb => {
          qb.where('is_public = 1')
            .orWhere('owner_id = :owner_id', { owner_id: res.locals.user.id })
        }))
        .andWhere(new TypeORM.Brackets(qb => {
          qb.where('title LIKE :title', { title: `%${req.query.keyword}%` })
            .orWhere('id = :id', { id: id })
        }));
      } else {
        query.where('is_public = 1')
             .andWhere(new TypeORM.Brackets(qb => {
               qb.where('title LIKE :title', { title: `%${req.query.keyword}%` })
                 .orWhere('id = :id', { id: id })
             }));
      }
    } else {
      query.where('title LIKE :title', { title: `%${req.query.keyword}%` })
           .orWhere('id = :id', { id: id });
    }

    let paginate = syzoj.utils.paginate(await List.countForPagination(query), req.query.page, syzoj.config.page.list);
    let lists = await List.queryPage(paginate, query);

    await lists.forEachAsync(async list => {
      list.owner = await User.findById(list.owner_id);
    });

    res.render('problem_lists', {
      lists: lists,
      paginate: paginate,
      allowCreateList: res.locals.user && await res.locals.user.hasPrivilege('manage_problem')
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/list/:id/edit', async (req, res) => {
  try {
    let listId = parseInt(req.params.id);
    let list = await List.findById(listId);
    if (!list) {
      if (!res.locals.user || !await res.locals.user.hasPrivilege('manage_problem')) {
        throw new ErrorMessage('您没有权限进行此操作。');
      }
      list = await List.create();
      list.id = 0;
    } else {
      if (!res.locals.user || !await list.isAllowedEditBy(res.locals.user)) {
        throw new ErrorMessage('您没有权限进行此操作。');
      }
    }

    res.render('problem_list_edit', {
      list: list
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.post('/list/:id/edit', async (req, res) => {
  try {
    let listId = parseInt(req.params.id);
    let list = await List.findById(listId);
    if (!list) {
      if (!res.locals.user || !await res.locals.user.hasPrivilege('manage_problem')) {
        throw new ErrorMessage('您没有权限进行此操作。');
      }
      list = await List.create();
      list.owner_id = res.locals.user.id;
    } else {
      if (!res.locals.user || !await list.isAllowedEditBy(res.locals.user)) {
        throw new ErrorMessage('您没有权限进行此操作。');
      }
    }
    if (!req.body.title.trim()) throw new ErrorMessage('题单名不能为空。');
    list.title = req.body.title;
    list.description = req.body.description;
    list.information = req.body.information;

    let problems = yaml.load(req.body.problems);
    if (typeof problems.type !== 'string' || !['array', 'renumber'].includes(problems.type)) {
      throw new ErrorMessage('不支持的题单编号类型。');
    }
    if(problems.type == 'array') {
      if (!Array.isArray(problems.id)) {
        throw new ErrorMessage('题单编号有误。');
      }
      for (let id of problems.id) {
        if (typeof id !== 'number') {
          throw new ErrorMessage('题单编号有误。');
        }
        if (!await Problem.findById(id)) {
          throw new ErrorMessage(`题号 ${id} 不存在。`);
        }
      }
    } else {
      if (typeof problems.id !== 'object') {
        throw new ErrorMessage('题单编号有误。');
      }
      for (let id in problems.id) {
        if (typeof problems.id[id] !== 'number') {
          throw new ErrorMessage('题单编号有误。');
        }
        if (!await Problem.findById(problems.id[id])) {
          throw new ErrorMessage(`题号 ${problems.id[id]} 不存在。`);
        }
      }
    }
    list.problems = req.body.problems;

    list.is_public = req.body.is_public === 'on';
    await list.save();

    res.redirect(syzoj.utils.makeUrl(['list', list.id]));
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/list/:id', async (req, res) => {
  try {
    let listId = parseInt(req.params.id);
    let list = await List.findById(listId);
    if (!list) throw new ErrorMessage('无此题单。');
    if (!await list.isAllowedUseBy(res.locals.user)) throw new ErrorMessage('题单未公开。');

    list.description = await syzoj.utils.markdown(list.description);
    list.information = await syzoj.utils.markdown(list.information);

    let ori_problems = yaml.load(list.problems), problems = {};
    let loadProblemById = async id => {
      let problem = await Problem.findById(id);
      problem.allowedUse = await problem.isAllowedUseBy(res.locals.user);
      problem.judge_state = await problem.getJudgeState(res.locals.user, true);
      problem.tags = await problem.getTags();
      sortTagList(problem.tags);
      return problem;
    };
    if (ori_problems.type == 'array') {
      for (let i = 0; i < ori_problems.id.length; ++i) {
        problems[i + 1] = await loadProblemById(ori_problems.id[i]);
      }
    } else {
      for (let i in ori_problems.id) {
        problems[i] = await loadProblemById(ori_problems.id[i]);
      }
    }

    res.render('problem_list', {
      list: list,
      problems: problems,
      owner: await User.findById(list.owner_id),
      allowedEdit: await list.isAllowedEditBy(res.locals.user)
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});
