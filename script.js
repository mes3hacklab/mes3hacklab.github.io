$(document).ready(function(){
	$('#contatti').hide(0);
	$('#chi_siamo').hide(0);
	

    $('#chi_siamo_link').click(function(){
		$('#about').fadeOut(500); 
		$('#contatti').fadeOut(500);
		$('#chi_siamo').delay(500).fadeIn(500);
		$('#contatti_link').css('font-size','100%');
		$('#about_link').css('font-size','100%');
		$('#chi_siamo_link').css('font-size','120%');
		$('#blog_link').css('font-size','100%');
		$('#progetti_link').css('font-size','100%');
	});
	$('#about_link').click(function(){
		$('#chi_siamo').fadeOut(500); 
		$('#contatti').fadeOut(500);
		$('#about').delay(500).fadeIn(500);
		$('#contatti_link').css('font-size','100%');
		$('#about_link').css('font-size','120%');
		$('#chi_siamo_link').css('font-size','100%');
		$('#blog_link').css('font-size','100%');
		$('#progetti_link').css('font-size','100%');
	});
	$('#contatti_link').click(function(){
		$('#chi_siamo').fadeOut(500); 
		$('#about').fadeOut(500);
		$('#contatti').delay(500).fadeIn(500);
		$('#contatti_link').css('font-size','120%');
		$('#about_link').css('font-size','100%');
		$('#chi_siamo_link').css('font-size','100%');
		$('#blog_link').css('font-size','100%');
		$('#progetti_link').css('font-size','100%');
	});	
	
	$('#progetti_link').click(function(){
		$('#progetti_link').css('font-size','120%');
		$('#about_link').css('font-size','100%');
		$('#chi_siamo_link').css('font-size','100%');
		$('#blog_link').css('font-size','100%');
		$('#contatti_link').css('font-size','100%');
		
	});	
	
	$('#blog_link').click(function(){
		$('#blog_link').css('font-size','120%');
		$('#progetti_link').css('font-size','100%');
		$('#about_link').css('font-size','100%');
		$('#chi_siamo_link').css('font-size','100%');
		$('#contatti_link').css('font-size','100%');
		
	});	
});
