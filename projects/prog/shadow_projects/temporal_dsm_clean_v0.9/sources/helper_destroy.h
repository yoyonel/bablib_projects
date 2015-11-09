#ifndef __HELPER_DESTROY_H__
#define __HELPER_DESTROY_H__

#include <Message.h>

void Viewer::destroyAll()
{
	destroyShaders();
	destroyTextures();
	destroyFrameBuffers();
	//
	destroyTimerQueryNV();
}

void Viewer::destroyShaders()
{
	Message::info( QString("# destroyShaders") );

	prog_depth_shadow_map.destroy();
	prog_draw_texture.destroy();
	prog_draw_scene_with_scm.destroy();
	//
	prog_vbo_dsm.destroy();
	prog_vbo_scm.destroy();
}

void Viewer::destroyTextures()
{
	Message::info( QString("# destroyTexturesForShadowMap" ));
	tex_shadow_map.destroy();
	for(int i=0; i<eSize; ++i) tex_shadow_clipmap[i].destroy();
}

void Viewer::destroyFrameBuffers()
{
	//printf("# destroyFrameBufferForShadowMap\n");
	fb_depth_shadow_map.destroy();
	for(int i=0; i<eSize; ++i) fb_shadow_clipmap[i].destroy();
}

void Viewer::destroyTimerQueryNV()
{
	//printf("# destroyTimerQueryNV\n");
	//tq_update_shadow_map.destroy();
	//tq_update_shadow_clip_map.destroy();
}

void Viewer::destroyTriSoup()
{
	delete ts;
}

void Viewer::destroyVBO()
{
	delete vbo;
	delete indexBuffer;
}
#endif
