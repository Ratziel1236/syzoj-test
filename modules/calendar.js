
const request = require('request-promise');

app.get('/calendar', async (req, res) => {
  try {
    const config = syzoj.config.calendar;

    if (!config.enabled)
      throw new ErrorMessage("未开启日历功能。");
    if (!config.api_url)
      throw new ErrorMessage("日历配置有误，请联系管理员。");

    res.render('calendar');
  } catch (err) {
    res.render('error', {
      err: err.message
    });
  }
});

app.get('/calendar/proxy', async (req, res) => {
  try {
    const config = syzoj.config.calendar;

    if (!config.enabled)
      throw new ErrorMessage("未开启日历功能。");
    if (!config.api_url)
      throw new ErrorMessage("日历配置有误，请联系管理员。");
    if (!config.self_proxy)
      return res.redirect(config.api_url);

    const result = await request({
      uri: config.api_url,
      timeout: 2000,
      json: true
    });

    res.send(result);
  } catch (err) {
    res.render('error', {
      err: err.message
    });
  }
});
