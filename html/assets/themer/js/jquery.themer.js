/*----------------------------------------------------*/
/*  Application Themer
/*----------------------------------------------------*/
$(function () {
    $('.themer .header').on('click', function (e) {
        $body = $(this).parents('.themer').find('.body');
        $body.toggle();

        //console.log($body);
        e.preventDefault;
    });
});
$(function () {
    $('.themer .color li').on('click', function (e) {
        $style = 'css/color/'+$(this).data('style')+'.css';
        $('.themer .color li').each(function () {
            $(this).removeClass('active');
        });
        $(this).addClass('active');
        $('#base-color').attr('href', $style);
    });

    $('.themer .background li').on('click', function (e) {
        $style = 'css/background/'+$(this).data('style')+'.css';
        $('.themer .background li').each(function () {
            $(this).removeClass('active');
        });
        $(this).addClass('active');
        $('#base-bg').attr('href', $style);
    });
});
$(function () {
    // Fixed Header - enabled
    $('[data-toggle="fixedheader"]').on('ifChecked', function (e){
        $('#wrapper').addClass($(this).val());
    });
    // Fixed Header - disabled
    $('[data-toggle="fixedheader"]').on('ifUnchecked', function (e){
        $('#wrapper').removeClass($(this).val());
        $('[data-toggle="fixedsidebar"]').iCheck('uncheck');
    });

    // Fixed Sidebar - enabled
    $('[data-toggle="fixedsidebar"]').on('ifChecked', function (e){
        $('#wrapper').addClass($(this).val());
        $('[data-toggle="fixedheader"]').iCheck('check');
    });
    // Fixed Sidebar - disabled
    $('[data-toggle="fixedsidebar"]').on('ifUnchecked', function (e){
        $('#wrapper').removeClass($(this).val());
        $('[data-toggle="fixedheader"]').iCheck('uncheck');
    });

    // Boxed Layout - enabled
    $('[data-toggle="boxedlayout"]').on('ifChecked', function (e){
        $('#wrapper').addClass($(this).val());
    });
    // Boxed Layout - disabled
    $('[data-toggle="boxedlayout"]').on('ifUnchecked', function (e){
        $('#wrapper').removeClass($(this).val());
    });
});