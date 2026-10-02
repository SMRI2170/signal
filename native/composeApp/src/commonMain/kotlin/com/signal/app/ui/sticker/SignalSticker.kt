package com.signal.app.ui.sticker

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Path

@Composable
fun SignalSticker(
  modifier: Modifier = Modifier,
  rotation: Float = 0f,
  content: @Composable BoxScope.() -> Unit,
) {
  Box(modifier.rotate(rotation), content = content)
}

internal fun heartPath(
  left: Float,
  top: Float,
  width: Float,
  height: Float,
): Path = Path().apply {
  moveTo(left + width * .50f, top + height * .86f)
  cubicTo(
    left + width * .38f,
    top + height * .72f,
    left + width * .08f,
    top + height * .52f,
    left + width * .08f,
    top + height * .28f,
  )
  cubicTo(
    left + width * .08f,
    top + height * .08f,
    left + width * .34f,
    top + height * .02f,
    left + width * .50f,
    top + height * .23f,
  )
  cubicTo(
    left + width * .66f,
    top + height * .02f,
    left + width * .92f,
    top + height * .08f,
    left + width * .92f,
    top + height * .28f,
  )
  cubicTo(
    left + width * .92f,
    top + height * .52f,
    left + width * .62f,
    top + height * .72f,
    left + width * .50f,
    top + height * .86f,
  )
  close()
}
