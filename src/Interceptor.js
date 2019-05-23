import {debug_console} from "./debug_console.js"

  /**
   * 日志拦截处理器类
   * 注意本功能会对原始记录进行包装，比如原始记录：{ msg: "我是一条记录"}
   * 节流处理后，这条记录可能被删除，也可能输出，如果这条记录被输出将转换为 {addtime: timenumber, reporttime:timenumber, times: number, origin: {msg: "我是一条记录"} }
   * @class Interceptor 
   * @description 对指定时间内的重复日志节流统计上报
   * @params {object} option - 提供配置的对象
   * @params {function=} option.diff - 俩条记录的判重函数
   * @params {function=} option.report - 节流后的记录输出
   * @params {number} [option.delay=5000] - 单位ms
   * @author 069810
   * @date 2019-05-23
   * @returns null
   */
  function Interceptor(option){

    // 对连续5000毫秒时间间隔内的请求进行节流
    this.delay = option.delay ? option.delay : 5000;

    this.dff = option.diff ? option.diff : function(o, n) { return o.msg === o.msg }

    // 上报总次数
    this.totaltimes = 0;

    // 上报处理器在队列中的id
    this.timeoutId = null;

    // 上一条引用
    this.pre = null;

    // 重复开始时间, 第一次重复的时候记录
    this.repeattime = null;
    this.repeat  = false;

    /**
     * @description 添加记录函数
     * @params {object} item - 日志记录对象
     * @returns this - 方便链式调用方法
     */
    this.add = function add(item) {

      debug_console('添加记录', item);

      var ths = this, now = Date.now();

      item = {addtime:null, times: 0, reporttime: null, origin: item}
      item.addtime = now;
      item.times = 1;
      // 是否第一次请求
      if(this.pre) {
        // 非第一次请求

        debug_console('非第一次请求', item, "记录添加时间差", item.addtime - this.pre.addtime)

        // 俩次请求的添加时间超过延时间隔了，上一条日志已经上报完成了，对新的请求重新记录
        if(item.addtime - this.pre.addtime >= this.delay)
        {

          debug_console("俩次添加时间间隔超出延时间隔，上条日志已经上报，添加新的记录到队列")
          this.repeat = false
          this.pre = item;
          this.timeoutId = setTimeout(function timeoutHandler(o) {
            o.reporttime = Date.now();
            ths.report(o)
            debug_console("添加间隔超出延时间隔上报",o)
          }, this.delay, item)
        }
        else
        { // 倒计时时间内收到新的请求,且重复时间不超过延时间隔

          debug_console("倒计时时间内再次收到请求，对请求进行判重")

          // 对本请求和上一条请求进行判重
          if(option.diff(this.pre.origin,item.origin))
          {

            debug_console("重复")

            if(!this.repeat)
            { // 重复标识为false, 记录开始重复时间
              this.repeattime = this.pre.addtime
              debug_console("第一次重复,开始重复计时", this.repeattime)
            }
            // 重复
            if(this.repeattime && item.addtime - this.repeattime > this.delay)
            {
              debug_console("超过重复时间间隔，上报日志")
            // 重复记录超过延时时间间隔，上报重复日志，清除重复次数，并重新记录重复日志
              // 重复次数清1
              item.times = 1
              this.pre = item
              this.repeat = false
              this.timeoutId = setTimeout(function timeoutHandler(o) {
                o.reporttime = Date.now();
                ths.report(o)
                debug_console("超过重复时间间隔，重新添加记录到队列",o)
              }, this.delay, item)
            }
            else
            {
              debug_console("未超过延时间隔，清除上报进程，重新记录")
              // 重复记录未超过延时时间间隔，清除队列中的上报进程，重复次数++，更新记录,并添加新的记录
              item.times = this.pre.times + 1
              this.timeoutId&&clearTimeout(this.timeoutId)
              this.pre = item
               // 重复标识设置为true
              this.repeat = true
              this.timeoutId = setTimeout(function timeoutHandler(o) {
                o.reporttime = Date.now();
                ths.report(o)
                debug_console("未超过延时间隔，重新添加记录到队列",o)
              }, this.delay, item)
            }

          }
          else
          {
            // 非重
            debug_console("非重")
            this.pre = item;
            this.repeat = false;
            this.timeoutId = setTimeout(function timeoutHandler(o) {
              o.reporttime = Date.now();
              ths.report(o)
              // debug_console("非重上报",o)
            }, this.delay, item)
          }
        }
      }
      else
      { // 第一次请求
        debug_console("第一次请求", item)
        this.pre = item;
        this.timeoutId = setTimeout(function timeoutHandler(o) {
          o.reporttime = Date.now();
          ths.report(o)
        }, this.delay, item)
      }
      return this;
    }

    /**
     * @params - item 节流后请求输出位置
     */
    this.report = function(item) {
      debug_console('report', item, "times:", ++this.totaltimes)
    }
  }


  export {Interceptor}