# SPDX-License-Identifier: Apache-2.0
#
# Copyright (C) 2023 ImmortalWrt.org
# dev <dev@idea.lan>

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-qbittorrent
PKG_VERSION:=1.0.1
PKG_RELEASE:=2

LUCI_TITLE:=LuCI app for qBittorrent
LUCI_DEPENDS:=+qbittorrent
LUCI_PKGARCH:=all

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature
