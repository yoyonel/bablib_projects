TARGET   = View
TEMPLATE = app
CONFIG  *= warn_on debug

CONFIG *= bablib
CONFIG *= gsl
CONFIG *= scene3d

HEADERS = sources/*.h
SOURCES = sources/*.cpp

PROJECT_PATH = $$PWD

#include($$[QPROG]/project_config.pri)
include($$[QPROG]/config_project.pri)
