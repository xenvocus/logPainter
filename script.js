// QQ跑团记录着色器 - 主脚本
// 原作者: 风羽 | 修改: 溯洄
// v2.6

(function ($, window, document) {
    'use strict';

    // ===== 全局变量定义 =====
    let playerList = [];              // 角色列表
    let messageList = [];             // 消息列表
    const colorList = 'red;green;pink;orange;purple;black;blue;yellow;beige;brown;teal;navy;maroon;limegreen;white;fuchsia;silver'.split(';');
    const colorNameList = '红色;绿色;粉红;橘色;紫色;黑色;蓝色;黄色;米色;棕色;蓝绿;深蓝;紫红;莱姆;白色;桃红;灰色'.split(';');
    
    let defaultColor = 'silver';
    let filterCommandEnabled = true;
    let filterOtherEnabled = true;
    let filterImageEnabled = true;
    let showTimeEnabled = true;
    let usePalette = false;
    let filterTitleEnabled = true;
    let mode = 0;  // 0: QQ模式, 1: Aileen模式
    let docxParagraphs = [];
    let plainText = '';

    // ===== 类定义 =====
    class Player {
        constructor(name, colorIndex) {
            this.name = name;
            this.color = colorList[colorIndex];
            this.valid = true;
        }
    }

    class Message {
        constructor(time, player, content) {
            this.time = time;
            this.player = player;
            this.content = content;
        }
    }

    // ===== 辅助函数 =====
    
    /**
     * 检查角色是否存在
     */
    function playerExists(name) {
        return playerList.some(p => p.name === name);
    }

    /**
     * 添加角色
     */
    function addPlayer(name, colorIndex) {
        playerList.push(new Player(name, colorIndex));
    }

    /**
     * 获取角色对象
     */
    function getPlayer(name) {
        return playerList.find(p => p.name === name) || null;
    }

    /**
     * 初始化颜色选择器事件
     */
    function initColorPickers() {
        $('select').change(function () {
            const color = $(this).val();
            const index = parseInt($(this).attr('name'));
            $(this).css('background-color', color);
            updatePlayerColor(index, color);
        });

        $('.input_name').change(function () {
            const name = $(this).val();
            const index = parseInt($(this).attr('name'));
            playerList[index].name = name;
            renderOutput();
        });

        // 初始化颜色
        for (let i = 0; i < playerList.length; i++) {
            const selectId = `#select_${i}`;
            const color = colorList[i];
            playerList[i].color = color;
            $(selectId).val(color);
            $(selectId).css('background-color', color);
        }
    }

    /**
     * 生成角色行HTML
     */
    function generatePlayerRow(index, name) {
        const template = $('#html_player_grid').html();
        
        if (usePalette) {
            return template
                .replace(/&name/g, name)
                .replace(/&id/g, index)
                .replace('&select', `<input class="form-control palette" name="${index}" id="palette_${index}" type="text">`);
        } else {
            const selectHtml = colorNameList.reduce((html, colorName, i) => {
                return html + `<option value="${colorList[i]}" style="background-color:${colorList[i]};">${colorName}</option>`;
            }, `<select name="${index}" id="select_${index}" class="form-control">`);
            
            return template
                .replace(/&name/g, name)
                .replace(/&id/g, index)
                .replace('&select', selectHtml + '</select>');
        }
    }

    /**
     * 刷新角色列表UI
     */
    function renderPlayerList() {
        let html = '<div class="div_center div_italic" style="color:red"><p>出现的PC名字 (点击可以修改)</p><br></div>';
        
        for (let i = 0; i < playerList.length; i++) {
            if (i % 2 === 0) html += '<div class="row">';
            html += generatePlayerRow(i, playerList[i].name);
            if (i % 2 === 1) html += '</div>';
        }
        
        if (playerList.length % 2 === 0) html += '</div>';
        
        $('#div_names').html(html);

        if (usePalette) {
            // 初始化颜色选择器
            $('.palette').each(function () {
                const cp = new window.CP(this);
                cp.on('change', function (color) {
                    this.source.value = color;
                    $(this.source).css('background-color', color);
                    updatePlayerColor(this.source.name, color);
                });
                $(this).click(function () {
                    $(this).select();
                });
                $(this).change(function () {
                    cp.set(window.CP.parse($(this).val()));
                });
            });
            
            $('.input_name').change(function () {
                const name = $(this).val();
                const index = parseInt($(this).attr('name'));
                playerList[index].name = name;
                renderOutput();
            });
        } else {
            initColorPickers();
        }

        // 显示按钮
        $('#button_palette').fadeTo('slow', 0.7);
        $('#button_share').fadeTo('slow', 0.7);
        $('#button_download_txt').fadeTo('slow', 1);
        $('#button_download_docx').fadeTo('slow', 1);

        // 角色显示/隐藏按钮事件
        $('.button_player').click(function () {
            const index = parseInt($(this).attr('name'));
            playerList[index].valid = !playerList[index].valid;
            renderOutput();
            
            if (playerList[index].valid) {
                $(this).addClass('btn-success');
                $(this).text('On');
                $(this).removeClass('btn-default');
            } else {
                $(this).removeClass('btn-success');
                $(this).text('Off');
                $(this).addClass('btn-default');
            }
        });
    }

    /**
     * 更新角色颜色
     */
    function updatePlayerColor(index, color) {
        playerList[index].color = color;
        if (playerList[index].valid) {
            renderOutput();
        }
    }

    /**
     * 渲染输出
     */
    function renderOutput() {
        if (mode === 1) {
            renderAileenMode();
        } else {
            renderQQMode();
        }
    }

    /**
     * Aileen模式输出
     */
    function renderAileenMode() {
        let forumCode = '';
        let preview = '';

        for (let i = 0; i < messageList.length; i++) {
            const msg = messageList[i];
            let color = msg.player.color;
            let name = msg.player.name;
            let content = msg.content;

            if (!msg.player.valid && name !== '旁白') {
                name = '';
                color = getPlayer('旁白').color;
                content = msg.player.name + '：' + msg.content;
            }

            if (name === '旁白') {
                name = '';
            } else if (name !== '') {
                name += '：';
            }

            forumCode += `[color=${color}]${name}${content}[/color]\n`;
            preview += `<span style="color:${color};">${name}${content}</span><br>`;
        }

        if (usePalette) {
            forumCode = '调色盘模式下的颜色不兼容论坛代码，请双击全选预览中的文字，复制粘贴到Word中保存';
        }

        $('#textarea_log_output').val(forumCode);
        $('#div_log_view').html(preview);
    }

    /**
     * QQ模式输出
     */
    function renderQQMode() {
        docxParagraphs = [];
        plainText = '';
        let forumCode = '';
        let preview = '';

        for (let i = 0; i < messageList.length; i++) {
            const msg = messageList[i];
            
            if (!msg.player.valid) continue;

            const color = msg.player.color;
            const name = msg.player.name;

            if (showTimeEnabled) {
                forumCode += `[color=${defaultColor}]${msg.time}[/color] `;
            }

            forumCode += `[color=${color}]<${msg.player.name}> ${msg.content}[/color]\n`;

            if (showTimeEnabled) {
                preview += `<span style="color:${defaultColor};">${msg.time}</span> `;
            }

            preview += `<span style="color:${color};">&lt;${name}&gt; ${msg.content}</span><br>`;

            // 生成DOCX段落
            const runs = [];
            if (showTimeEnabled) {
                runs.push(new docx.TextRun({
                    text: msg.time + ' ',
                    color: defaultColor
                }));
            }
            runs.push(new docx.TextRun({
                text: `<${msg.player.name}> ${msg.content}`,
                color: color
            }));
            docxParagraphs.push(new docx.Paragraph({ children: runs }));

            // 生成纯文本
            if (showTimeEnabled) {
                plainText += msg.time + ' ';
            }
            plainText += `<${msg.player.name}> ${msg.content}\n`;
        }

        if (usePalette) {
            forumCode = '调色盘模式下的颜色不兼容论坛代码，请双击全选预览中的文字，复制粘贴到Word中保存';
        }

        $('#textarea_log_output').val(forumCode);
        $('#div_log_view').html(preview);
    }

    // ===== 事件处理 =====

    /**
     * 特殊模式1（Aileen）切换
     */
    $('#specialMode1').click(function () {
        $('body').css('background-color', '#f0e4f7');
        $('#div_log_view').css('background-color', '#ffffff');
        
        $('#header_title').fadeOut('fast', function () {
            $('#header_title').text('艾德琳的文本着色器');
            $('#header_title').fadeIn();
        });
        
        $('#header_version').fadeOut('slow', function () {
            $('#header_version').text('v1.2 by 风羽(溯洄改)');
            $('#header_version').fadeIn();
        });

        $('#specialMode1').hide();
        $('#defaultMode').show();
        
        mode = 1;
        usePalette = true;
        $('#button_palette').text('使用论坛颜色');
        $('#div_log_view').css('background-color', '#ffffff');
        
        playerList = [];
        messageList = [];
        $('html,body').animate({ scrollTop: 1 }, 'fast');
        $('#div_log').fadeOut('fast');
        $('#button_palette').hide();
        $('#button_share').hide();
        $('#button_download_txt').hide();
        $('#button_download_docx').hide();
        $('#div_names').html('');
    });

    /**
     * 默认模式（QQ）切换
     */
    $('#defaultMode').click(function () {
        $('body').css('background-color', '#D1EAF7');
        $('#div_log_view').css('background-color', '');
        
        $('#header_title').fadeOut('fast', function () {
            $('#header_title').text('QQ跑团记录着色器');
            $('#header_title').fadeIn();
        });
        
        $('#header_version').fadeOut('slow', function () {
            $('#header_version').text('v2.6 by 风羽(溯洄改)');
            $('#header_version').fadeIn();
        });

        $('#defaultMode').hide();
        $('#specialMode1').show();
        
        mode = 0;
        usePalette = false;
        $('#button_palette').text('使用调色盘');
        $('#div_log_view').css('background-color', '');
        
        playerList = [];
        messageList = [];
        $('html,body').animate({ scrollTop: 1 }, 'fast');
        $('#div_log').fadeOut('fast');
        $('#button_palette').hide();
        $('#button_share').hide();
        $('#button_download_txt').hide();
        $('#button_download_docx').hide();
        $('#div_names').html('');
    });

    /**
     * 下载为TXT
     */
    $('#button_download_txt').click(function () {
        saveAs(new Blob([plainText]), 'download.txt');
    });

    /**
     * 下载为DOCX
     */
    $('#button_download_docx').click(function () {
        const doc = new docx.Document({
            sections: [{
                children: docxParagraphs
            }]
        });
        docx.Packer.toBlob(doc).then(blob => {
            saveAs(blob, 'download.docx');
        });
    });

    /**
     * 页面加载完成
     */
    $(document).ready(function () {
        $('#div_log').hide();
        $('#button_palette').hide();
        $('#button_share').hide();
        $('#button_download_txt').hide();
        $('#button_download_docx').hide();
        $('#defaultMode').hide();

        // 检查URL参数
        function getQueryParam(name) {
            const search = window.location.search.substring(1);
            const params = search.split('&');
            for (let i = 0; i < params.length; i++) {
                const param = params[i].split('=');
                if (param[0] === name) return param[1];
            }
            return false;
        }

        const s3Url = getQueryParam('s3');
        if (s3Url) {
            $.ajax({
                url: 'https://dicelogger.s3-accelerate.amazonaws.com/' + s3Url,
                tryCount: 0,
                retryLimit: 3,
                success: function (data) {
                    $('#textarea_log_input').val(data);
                    $('#button_log_analyze').click();
                },
                error: function (xhr, status) {
                    if (status === 'timeout') {
                        this.tryCount++;
                        if (this.tryCount <= this.retryLimit) {
                            $.ajax(this);
                        }
                    } else {
                        $('#textarea_log_input').val('获取跑团日志失败! 请刷新重试!');
                    }
                }
            });
        } else if ($('#textarea_log_input').val() !== '') {
            $('#button_log_analyze').click();
        }
    });

    /**
     * 指令过滤按钮
     */
    $('#button_log_command').click(function () {
        filterCommandEnabled = !filterCommandEnabled;
        if (filterCommandEnabled) {
            $(this).addClass('btn-info').text('指令过滤 On').removeClass('btn-warning');
        } else {
            $(this).removeClass('btn-info').text('指令过滤 Off').addClass('btn-warning');
        }
    });

    /**
     * 开头内容过滤按钮
     */
    $('#button_log_other').click(function () {
        filterOtherEnabled = !filterOtherEnabled;
        if (filterOtherEnabled) {
            $(this).addClass('btn-info').text('(开头内容过滤 On').removeClass('btn-warning');
        } else {
            $(this).removeClass('btn-info').text('(开头内容过滤 Off').addClass('btn-warning');
        }
    });

    /**
     * 图片过滤按钮
     */
    $('#button_log_pic_text').click(function () {
        filterImageEnabled = !filterImageEnabled;
        if (filterImageEnabled) {
            $(this).addClass('btn-info').text('[图片]过滤 On').removeClass('btn-warning');
        } else {
            $(this).removeClass('btn-info').text('[图片]过滤 Off').addClass('btn-warning');
        }
    });

    /**
     * 时间显示按钮
     */
    $('#button_log_time').click(function () {
        showTimeEnabled = !showTimeEnabled;
        if (showTimeEnabled) {
            $(this).addClass('btn-info').text('显示时间 On').removeClass('btn-warning');
        } else {
            $(this).removeClass('btn-info').text('显示时间 Off').addClass('btn-warning');
        }
    });

    /**
     * 人名头衔过滤按钮
     */
    $('#button_log_nname').click(function () {
        filterTitleEnabled = !filterTitleEnabled;
        if (filterTitleEnabled) {
            $(this).addClass('btn-info').text('人名头衔过滤 On').removeClass('btn-warning');
        } else {
            $(this).removeClass('btn-info').text('人名头衔过滤 Off').addClass('btn-warning');
        }
    });

    /**
     * 清除按钮
     */
    $('#button_log_clear').click(function () {
        $('html,body').animate({ scrollTop: 1 }, 'fast');
        playerList = [];
        messageList = [];
        $('#div_log').fadeOut('fast');
        $('#button_palette').hide();
        $('#button_share').hide();
        $('#button_download_txt').hide();
        $('#button_download_docx').hide();
        $('#textarea_log_input').val('');
        $('#div_names').html('');
    });

    /**
     * 日志视图双击选中
     */
    $('#div_log_view').dblclick(function () {
        const range = document.createRange();
        range.selectNode(document.getElementById(this.id));
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });

    /**
     * 输出框点击选中
     */
    $('#textarea_log_output').click(function () {
        $(this).select();
    });

    /**
     * 调色盘按钮
     */
    $('#button_palette').click(function () {
        usePalette = !usePalette;
        renderPlayerList();
        
        if (usePalette) {
            $(this).text('使用论坛颜色');
            $('#div_log_view').css('background-color', '#ffffff');
            $('#button_share').hide();
        } else {
            $(this).text('使用调色盘');
            $('#div_log_view').css('background-color', '');
            $('#button_share').fadeTo('slow', 0.7);
            renderOutput();
        }
    });

    /**
     * 分享按钮
     */
    $('#button_share').click(function () {
        const code = $('#textarea_log_output').val();
        if (!usePalette && code) {
            const title = encodeURIComponent('跑团记录分享');
            const content = encodeURIComponent(code);
            window.open(`https://forum.kokona.tech/composer?title=${title}&tag=water&content=${content}`);
        }
    });

    /**
     * 分析按钮
     */
    $('#button_log_analyze').click(function () {
        if ($('#textarea_log_input').val() !== '') {
            $('html,body').animate({ scrollTop: $('#div_names').offset().top }, 500);
        }

        let messageCount = 0;

        if (mode === 1) {
            messageCount = parseAileenLog();
        } else {
            messageCount = parseQQLog();
        }

        if (messageCount > 0) {
            renderPlayerList();
            renderOutput();
            $('#div_log').show();
        } else {
            $('#div_log').hide();
            $('#button_palette').hide();
            $('#button_share').hide();
            $('#button_download_txt').hide();
            $('#button_download_docx').hide();
            $('#defaultMode').hide();
            $('#div_names').html('<div class="div_center div_italic" style="color:red"><p>无法识别聊天记录文本，请确认输入格式正确</p></div>');
        }
    });

    /**
     * 解析Aileen模式日志
     */
    function parseAileenLog() {
        playerList = [];
        messageList = [];
        $('#div_names').html('');
        $('#div_log').hide();

        const nameRegex = /(.+?)[:：](.*)/;
        const lines = $('#textarea_log_input').val().split('\n');
        let colorIndex = 0;

        addPlayer('旁白', 0);

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(nameRegex);
            
            if (match) {
                const name = match[1].trim();
                const content = match[2];
                
                if (name && !playerExists(name)) {
                    addPlayer(name, colorIndex);
                    colorIndex++;
                }
                
                messageList.push(new Message('', getPlayer(name), content));
            } else {
                messageList.push(new Message('', getPlayer('旁白'), lines[i]));
            }
        }

        return playerList.length;
    }

    /**
     * 解析QQ模式日志
     */
    function parseQQLog() {
        playerList = [];
        messageList = [];
        $('#div_names').html('');
        $('#div_log').hide();

        const dateTimeRegex = /\d{4}(?:-|\/)\d{1,2}(?:-|\/)\d{1,2} (\d{1,2}:\d{2}:\d{2}) (AM|PM)? ?([^\(]*)/;
        const datetimeRegex = /(.*?)(\([0-9]+\))? +\d{4}(?:-|\/)\d{1,2}(?:-|\/)\d{1,2} +(\d{1,2}:\d{2}:\d{2}).*/;
        const timeRegex = /(.*?)(\([0-9]+\))? +(\d{1,2}:\d{2}:\d{2}).*/;
        const commandRegex = /^([\.。!！][rR]|[\/\.、。!！][mM][eE]|[\.。!！][hH][eE][lL][pP]|[\.。!！][lL][oO][gG]|[\.。!！][wW]|[\.。!！][sS][cC]|[\.。!！][eE][nN]|[\.。!！][sS][eE][tT]|[\.。!！][sS][tT]|[\.。!！][cC][oO][cC]|[\.。!！][dD][nN][dD]|[\.。!！][tTlL][iI]|[\.。!！][jJ][rR][rR][pP]|[\.。!！][rR][uU][lL][eE][sS]|[\.。!！][nN]|[\.。!！][bB][oO][tT]|[\.。!！][oO][bB]|[\.。!！][wW][eE][lL][cC][oO][mM][eE]).*/;
        const bracketRegex = /^(\(|（).*/;
        const imageRegex = /\[图片\]/;

        const lines = $('#textarea_log_input').val().split('\n');
        let currentPlayer = '';
        let currentTime = '';
        let colorIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].length === 0) continue;

            const dateTimeMatch = lines[i].match(dateTimeRegex);
            const datetimeMatch = lines[i].match(datetimeRegex);
            const timeMatch = lines[i].match(timeRegex);

            if (dateTimeMatch || datetimeMatch || timeMatch) {
                if (dateTimeMatch) {
                    currentPlayer = dateTimeMatch[3].trim();
                    currentTime = dateTimeMatch[1];
                } else if (datetimeMatch) {
                    currentPlayer = datetimeMatch[1].trim();
                    currentTime = datetimeMatch[3];
                } else if (timeMatch) {
                    currentPlayer = timeMatch[1].trim();
                    currentTime = timeMatch[3];
                }

                // 处理人名头衔
                if (filterTitleEnabled && currentPlayer.indexOf('【') === 0 && currentPlayer.indexOf('】') !== -1) {
                    currentPlayer = currentPlayer.substring(currentPlayer.indexOf('】') + 1);
                }

                if (currentPlayer && currentPlayer !== '系统消息') {
                    if (!playerExists(currentPlayer)) {
                        addPlayer(currentPlayer, colorIndex);
                        colorIndex++;
                    }
                }
            } else {
                // 处理消息内容
                if (currentPlayer === '') continue;
                if (currentPlayer === '系统消息') continue;
                if (filterCommandEnabled && lines[i].match(commandRegex)) continue;
                if (filterOtherEnabled && lines[i].match(bracketRegex)) continue;
                
                if (filterImageEnabled) {
                    lines[i] = lines[i].replace(imageRegex, '');
                    if (lines[i].length === 0) continue;
                }

                if (currentTime.length !== 8) {
                    currentTime = ' ' + currentTime;
                }

                messageList.push(new Message(currentTime, getPlayer(currentPlayer), lines[i]));
            }
        }

        return playerList.length;
    }

})(jQuery, window, document);
